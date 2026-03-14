"""
crud.py
-------
All database query functions — Create, Read, Update, Delete.

Routers call these functions; they never write raw SQL themselves.
This keeps the database logic testable and centralized.
"""

from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app import models, schemas


# ══════════════════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════════════════

def create_user(db: Session, user: schemas.UserCreate) -> models.User:
    """Register a new user. Raises IntegrityError if phone/email already exists."""
    db_user = models.User(**user.model_dump())
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.user_id == user_id).first()


def get_user_by_phone(db: Session, phone: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.phone == phone).first()


def get_all_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()


# ══════════════════════════════════════════════════════════════════
# COMPANY
# ══════════════════════════════════════════════════════════════════

def create_company(db: Session, company: schemas.CompanyCreate) -> models.Company:
    """Register a new water tanker company."""
    db_company = models.Company(**company.model_dump())
    db.add(db_company)
    db.commit()
    db.refresh(db_company)
    return db_company


def get_company_by_id(db: Session, company_id: int) -> Optional[models.Company]:
    return db.query(models.Company).filter(models.Company.company_id == company_id).first()


def get_all_companies(
    db: Session,
    skip: int = 0,
    limit: int = 100
) -> List[models.Company]:
    return (
        db.query(models.Company)
        .filter(models.Company.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_companies_by_district(db: Session, district: str) -> List[models.Company]:
    """Return all active companies operating in the given district."""
    return (
        db.query(models.Company)
        .filter(
            models.Company.district.ilike(f"%{district}%"),
            models.Company.is_active == True
        )
        .all()
    )


def update_company_vehicle_count(db: Session, company_id: int) -> None:
    """Recalculate and persist the total number of tankers for a company."""
    count = (
        db.query(func.count(models.Tanker.tanker_id))
        .filter(models.Tanker.company_id == company_id)
        .scalar()
    )
    db.query(models.Company).filter(
        models.Company.company_id == company_id
    ).update({"number_of_vehicles": count})
    db.commit()


# ══════════════════════════════════════════════════════════════════
# TANKER
# ══════════════════════════════════════════════════════════════════

def create_tanker(db: Session, tanker: schemas.TankerCreate) -> models.Tanker:
    """Add a tanker vehicle to a company."""
    db_tanker = models.Tanker(**tanker.model_dump())
    db.add(db_tanker)
    db.commit()
    db.refresh(db_tanker)
    # Keep company's vehicle count in sync
    update_company_vehicle_count(db, tanker.company_id)
    return db_tanker


def get_tanker_by_id(db: Session, tanker_id: int) -> Optional[models.Tanker]:
    return db.query(models.Tanker).filter(models.Tanker.tanker_id == tanker_id).first()


def get_available_tankers(
    db: Session,
    company_id: int,
    capacity_liters: int
) -> List[models.Tanker]:
    """Return available tankers of a given capacity for a specific company."""
    return (
        db.query(models.Tanker)
        .filter(
            models.Tanker.company_id         == company_id,
            models.Tanker.capacity_liters    == capacity_liters,
            models.Tanker.availability_status == models.AvailabilityStatus.available,
        )
        .all()
    )


def count_available_tankers(
    db: Session,
    company_id: int,
    capacity_liters: int
) -> int:
    """Count how many tankers of a capacity are currently available in a company."""
    return (
        db.query(func.count(models.Tanker.tanker_id))
        .filter(
            models.Tanker.company_id         == company_id,
            models.Tanker.capacity_liters    == capacity_liters,
            models.Tanker.availability_status == models.AvailabilityStatus.available,
        )
        .scalar()
    )


def get_min_price_for_capacity(
    db: Session,
    company_id: int,
    capacity_liters: int
) -> Optional[float]:
    """Return the lowest price_per_delivery for a given capacity in a company."""
    result = (
        db.query(func.min(models.Tanker.price_per_delivery))
        .filter(
            models.Tanker.company_id      == company_id,
            models.Tanker.capacity_liters == capacity_liters,
        )
        .scalar()
    )
    return result


def set_tanker_status(
    db: Session,
    tanker_id: int,
    status: models.AvailabilityStatus
) -> Optional[models.Tanker]:
    """Change availability status of a tanker (available / booked / maintenance)."""
    tanker = get_tanker_by_id(db, tanker_id)
    if not tanker:
        return None
    tanker.availability_status = status
    db.commit()
    db.refresh(tanker)
    return tanker


# ══════════════════════════════════════════════════════════════════
# BOOKING
# ══════════════════════════════════════════════════════════════════

def create_booking(db: Session, booking: schemas.BookingCreate) -> models.Booking:
    """
    Create a booking and mark the tanker as 'booked'.
    NOTE: Payment is handled separately via /payments/create.
    """
    db_booking = models.Booking(**booking.model_dump())
    db.add(db_booking)
    # Mark tanker unavailable
    set_tanker_status(db, booking.tanker_id, models.AvailabilityStatus.booked)
    db.commit()
    db.refresh(db_booking)
    return db_booking


def get_booking_by_id(db: Session, booking_id: int) -> Optional[models.Booking]:
    return db.query(models.Booking).filter(models.Booking.booking_id == booking_id).first()


def get_bookings_by_user(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 50
) -> List[models.Booking]:
    return (
        db.query(models.Booking)
        .filter(models.Booking.user_id == user_id)
        .order_by(models.Booking.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_bookings_by_company(
    db: Session,
    company_id: int,
    skip: int = 0,
    limit: int = 50
) -> List[models.Booking]:
    return (
        db.query(models.Booking)
        .filter(models.Booking.company_id == company_id)
        .order_by(models.Booking.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_booking_status(
    db: Session,
    booking_id: int,
    status: models.BookingStatus
) -> Optional[models.Booking]:
    """Change booking status. When delivered → free up the tanker."""
    booking = get_booking_by_id(db, booking_id)
    if not booking:
        return None
    booking.booking_status = status
    if status == models.BookingStatus.delivered:
        set_tanker_status(db, booking.tanker_id, models.AvailabilityStatus.available)
    db.commit()
    db.refresh(booking)
    return booking


# ══════════════════════════════════════════════════════════════════
# PAYMENT
# ══════════════════════════════════════════════════════════════════

def create_payment(db: Session, payment: schemas.PaymentCreate) -> models.Payment:
    """
    Create a payment record.
    - UPI / card: status stays 'pending' until webhook confirms
    - Cash on delivery: status is 'pending' until driver marks delivered
    - Partial advance: advance_amount is stored; remainder collected on delivery
    """
    db_payment = models.Payment(**payment.model_dump())
    # For Cash on Delivery, payment completes at delivery
    if payment.payment_type == models.PaymentType.upi and payment.transaction_ref:
        db_payment.payment_status = models.PaymentStatus.completed
    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)
    return db_payment


def get_payment_by_booking(db: Session, booking_id: int) -> Optional[models.Payment]:
    return (
        db.query(models.Payment)
        .filter(models.Payment.booking_id == booking_id)
        .first()
    )


def complete_payment(db: Session, payment_id: int, transaction_ref: str) -> Optional[models.Payment]:
    """Mark a payment as completed (called after UPI callback / COD confirmation)."""
    payment = db.query(models.Payment).filter(models.Payment.payment_id == payment_id).first()
    if not payment:
        return None
    payment.payment_status  = models.PaymentStatus.completed
    payment.transaction_ref = transaction_ref
    db.commit()
    db.refresh(payment)
    return payment


# ══════════════════════════════════════════════════════════════════
# TRACKING
# ══════════════════════════════════════════════════════════════════

def upsert_tracking(db: Session, data: schemas.TrackingUpdate) -> models.Tracking:
    """
    Insert a new GPS record for a tanker.
    We keep a full history (useful for polyline replay on the map).
    """
    record = models.Tracking(**data.model_dump())
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_latest_location(db: Session, tanker_id: int) -> Optional[models.Tracking]:
    """Return the most recent GPS fix for a tanker."""
    return (
        db.query(models.Tracking)
        .filter(models.Tracking.tanker_id == tanker_id)
        .order_by(models.Tracking.timestamp.desc())
        .first()
    )


def get_recent_tracking_history(
    db: Session,
    tanker_id: int,
    limit: int = 20
) -> List[models.Tracking]:
    """Return last N GPS points for a tanker (for map polyline / breadcrumb trail)."""
    return (
        db.query(models.Tracking)
        .filter(models.Tracking.tanker_id == tanker_id)
        .order_by(models.Tracking.timestamp.desc())
        .limit(limit)
        .all()
    )
