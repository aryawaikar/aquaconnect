"""
models.py
---------
SQLAlchemy ORM models — one class per database table.

Tables:
  User       → platform customers
  Company    → water tanker businesses
  Tanker     → individual tanker vehicles owned by companies
  Booking    → a customer booking a tanker
  Payment    → payment record linked to a booking
  Tracking   → GPS coordinates emitted by tanker drivers
"""

from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, DateTime,
    ForeignKey, Enum, Boolean
)
from sqlalchemy.orm import relationship
import enum

from app.database import Base


# ── Enums ─────────────────────────────────────────────────────────────────────

class BookingStatus(str, enum.Enum):
    scheduled   = "scheduled"
    on_the_way  = "on_the_way"
    delivered   = "delivered"
    cancelled   = "cancelled"

class PaymentType(str, enum.Enum):
    upi              = "upi"
    cash_on_delivery = "cash_on_delivery"
    partial_advance  = "partial_advance"

class PaymentStatus(str, enum.Enum):
    pending   = "pending"
    completed = "completed"
    failed    = "failed"

class AvailabilityStatus(str, enum.Enum):
    available   = "available"
    booked      = "booked"
    maintenance = "maintenance"

class TankerCapacity(int, enum.Enum):
    cap_3000 = 3000
    cap_5000 = 5000
    cap_8000 = 8000
    cap_10000 = 10000


# ── User ──────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    user_id    = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name       = Column(String(100), nullable=False)
    phone      = Column(String(15),  nullable=False, unique=True, index=True)
    email      = Column(String(150), nullable=True,  unique=True, index=True)
    address    = Column(String(255), nullable=True)
    district   = Column(String(100), nullable=False)
    city       = Column(String(100), nullable=False, default="Pune")
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active  = Column(Boolean, default=True)

    # Relationships
    bookings = relationship("Booking", back_populates="user")


# ── Company ───────────────────────────────────────────────────────────────────

class Company(Base):
    __tablename__ = "companies"

    company_id       = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_name     = Column(String(150), nullable=False)
    owner_name       = Column(String(100), nullable=False)
    phone            = Column(String(15),  nullable=False, unique=True)
    email            = Column(String(150), nullable=True,  unique=True)
    district         = Column(String(100), nullable=False, index=True)
    city             = Column(String(100), nullable=False, default="Pune")
    number_of_vehicles = Column(Integer, default=0)
    # Approx GPS center of company's service area (for distance ranking)
    latitude         = Column(Float, nullable=True)
    longitude        = Column(Float, nullable=True)
    rating           = Column(Float, default=4.0)   # avg customer rating (0–5)
    created_at       = Column(DateTime, default=datetime.utcnow)
    is_active        = Column(Boolean, default=True)

    # Relationships
    tankers  = relationship("Tanker",  back_populates="company")
    bookings = relationship("Booking", back_populates="company")


# ── Tanker ────────────────────────────────────────────────────────────────────

class Tanker(Base):
    __tablename__ = "tankers"

    tanker_id          = Column(Integer, primary_key=True, index=True, autoincrement=True)
    company_id         = Column(Integer, ForeignKey("companies.company_id"), nullable=False, index=True)
    capacity_liters    = Column(Integer, nullable=False)          # 3000 / 5000 / 8000 / 10000
    vehicle_number     = Column(String(20), nullable=False, unique=True)
    availability_status = Column(
        Enum(AvailabilityStatus),
        default=AvailabilityStatus.available,
        nullable=False
    )
    price_per_delivery = Column(Float, nullable=False, default=500.0)  # ₹ per delivery
    created_at         = Column(DateTime, default=datetime.utcnow)

    # Relationships
    company   = relationship("Company",  back_populates="tankers")
    bookings  = relationship("Booking",  back_populates="tanker")
    trackings = relationship("Tracking", back_populates="tanker")


# ── Booking ───────────────────────────────────────────────────────────────────

class Booking(Base):
    __tablename__ = "bookings"

    booking_id     = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id        = Column(Integer, ForeignKey("users.user_id"),       nullable=False, index=True)
    company_id     = Column(Integer, ForeignKey("companies.company_id"), nullable=False)
    tanker_id      = Column(Integer, ForeignKey("tankers.tanker_id"),    nullable=False)
    capacity       = Column(Integer, nullable=False)   # litres requested
    timeslot       = Column(String(50), nullable=False) # e.g. "09:00-11:00"
    booking_date   = Column(String(20), nullable=False) # ISO date string YYYY-MM-DD
    booking_status = Column(
        Enum(BookingStatus),
        default=BookingStatus.scheduled,
        nullable=False
    )
    delivery_address = Column(String(255), nullable=True)
    created_at       = Column(DateTime, default=datetime.utcnow)
    updated_at       = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user    = relationship("User",    back_populates="bookings")
    company = relationship("Company", back_populates="bookings")
    tanker  = relationship("Tanker",  back_populates="bookings")
    payment = relationship("Payment", back_populates="booking", uselist=False)


# ── Payment ───────────────────────────────────────────────────────────────────

class Payment(Base):
    __tablename__ = "payments"

    payment_id     = Column(Integer, primary_key=True, index=True, autoincrement=True)
    booking_id     = Column(Integer, ForeignKey("bookings.booking_id"), nullable=False, unique=True)
    payment_type   = Column(Enum(PaymentType),   nullable=False)
    amount         = Column(Float,               nullable=False)  # total ₹
    advance_amount = Column(Float, default=0.0)  # for partial_advance mode
    payment_status = Column(
        Enum(PaymentStatus),
        default=PaymentStatus.pending,
        nullable=False
    )
    transaction_ref = Column(String(100), nullable=True)  # UPI txn ID or receipt
    created_at      = Column(DateTime, default=datetime.utcnow)
    updated_at      = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    booking = relationship("Booking", back_populates="payment")


# ── Tracking ──────────────────────────────────────────────────────────────────

class Tracking(Base):
    __tablename__ = "tracking"

    tracking_id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    tanker_id   = Column(Integer, ForeignKey("tankers.tanker_id"), nullable=False, index=True)
    latitude    = Column(Float, nullable=False)
    longitude   = Column(Float, nullable=False)
    timestamp   = Column(DateTime, default=datetime.utcnow, index=True)
    speed_kmph  = Column(Float, nullable=True)   # optional telemetry
    heading     = Column(Float, nullable=True)   # 0–360 degrees

    # Relationships
    tanker = relationship("Tanker", back_populates="trackings")
