"""
schemas.py
----------
Pydantic models for request validation and response serialization.

Pattern per entity:
  <Entity>Create  → request body for POST
  <Entity>Update  → request body for PATCH
  <Entity>Out     → response schema (what the API returns)
"""

from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from app.models import (
    BookingStatus, PaymentType, PaymentStatus, AvailabilityStatus
)


# ══════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class OTPRequest(BaseModel):
    phone: str

class OTPVerify(BaseModel):
    phone: str
    otp: str

# ══════════════════════════════════════════════════════════════════
# USER
# ══════════════════════════════════════════════════════════════════

class UserCreate(BaseModel):
    name:     str
    phone:    str
    email:    Optional[EmailStr] = None
    address:  Optional[str]     = None
    district: str
    city:     str = "Pune"

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip()
        if not v.isdigit() or len(v) not in (10, 12):
            raise ValueError("Phone must be 10 or 12 digits")
        return v


class UserOut(BaseModel):
    user_id:    int
    name:       str
    phone:      str
    email:      Optional[str]
    address:    Optional[str]
    district:   str
    city:       str
    created_at: datetime
    is_active:  bool

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════
# COMPANY
# ══════════════════════════════════════════════════════════════════

class CompanyCreate(BaseModel):
    company_name:       str
    owner_name:         str
    phone:              str
    email:              Optional[EmailStr] = None
    district:           str
    city:               str = "Pune"
    latitude:           Optional[float]   = None
    longitude:          Optional[float]   = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        v = v.strip()
        if not v.isdigit() or len(v) not in (10, 12):
            raise ValueError("Phone must be 10 or 12 digits")
        return v


class CompanyOut(BaseModel):
    company_id:         int
    company_name:       str
    owner_name:         str
    phone:              str
    email:              Optional[str]
    district:           str
    city:               str
    number_of_vehicles: int
    latitude:           Optional[float]
    longitude:          Optional[float]
    rating:             float
    created_at:         datetime
    is_active:          bool

    model_config = {"from_attributes": True}


# Returned by the /companies/filter endpoint — includes price + score
class CompanyFilterResult(BaseModel):
    company_id:   int
    company_name: str
    district:     str
    city:         str
    rating:       float
    price:        float          # price of the requested capacity tanker
    capacity:     int            # litres
    available_tankers: int       # count of available tankers of that capacity
    distance_km:  Optional[float] = None   # distance from user's district centre
    score:        Optional[float] = None   # recommendation score (higher = better)

    model_config = {"from_attributes": True}


class RecommendationResult(BaseModel):
    """Response model for GET /recommendations — ranked tanker company."""
    company_id:        int
    company_name:      str
    district:          str
    city:              str
    price:             float
    capacity:          int
    distance_km:       Optional[float] = None
    rating:            float
    available_tankers: int
    score:             Optional[float] = None

    model_config = {"from_attributes": True}


class RecommendationSplitResult(BaseModel):
    """Response model combining top recommendations and the rest of the list."""
    recommendations: List[RecommendationResult]
    others:          List[RecommendationResult]

    model_config = {"from_attributes": True}


class TankerLocationResult(BaseModel):
    name: str
    capacity: int
    price: float
    rating: float
    latitude: Optional[float]
    longitude: Optional[float]
    city: str
    area: str


# ══════════════════════════════════════════════════════════════════
# TANKER
# ══════════════════════════════════════════════════════════════════

class TankerCreate(BaseModel):
    company_id:          int
    capacity_liters:     int         # must be 3000, 5000, 8000, or 10000
    vehicle_number:      str
    price_per_delivery:  float = 500.0

    @field_validator("capacity_liters")
    @classmethod
    def validate_capacity(cls, v):
        if v not in (3000, 5000, 8000, 10000):
            raise ValueError("Capacity must be 3000, 5000, 8000, or 10000 litres")
        return v


class TankerOut(BaseModel):
    tanker_id:           int
    company_id:          int
    capacity_liters:     int
    vehicle_number:      str
    availability_status: AvailabilityStatus
    price_per_delivery:  float
    created_at:          datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════
# BOOKING
# ══════════════════════════════════════════════════════════════════

class BookingCreate(BaseModel):
    user_id:          int
    company_id:       int
    tanker_id:        int
    capacity:         int
    timeslot:         str          # e.g. "09:00-11:00"
    booking_date:     str          # "YYYY-MM-DD"
    delivery_address: Optional[str] = None

    @field_validator("capacity")
    @classmethod
    def validate_capacity(cls, v):
        if v not in (3000, 5000, 8000, 10000):
            raise ValueError("Capacity must be 3000, 5000, 8000, or 10000 litres")
        return v


class BookingStatusUpdate(BaseModel):
    booking_status: BookingStatus


class BookingOut(BaseModel):
    booking_id:       int
    user_id:          int
    company_id:       int
    tanker_id:        int
    capacity:         int
    timeslot:         str
    booking_date:     str
    booking_status:   BookingStatus
    delivery_address: Optional[str]
    created_at:       datetime
    updated_at:       datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════
# PAYMENT
# ══════════════════════════════════════════════════════════════════

class PaymentCreate(BaseModel):
    booking_id:      int
    payment_type:    PaymentType
    amount:          float
    advance_amount:  float = 0.0
    transaction_ref: Optional[str] = None

    @field_validator("amount")
    @classmethod
    def validate_amount(cls, v):
        if v <= 0:
            raise ValueError("Amount must be greater than 0")
        return v


class PaymentOut(BaseModel):
    payment_id:      int
    booking_id:      int
    payment_type:    PaymentType
    amount:          float
    advance_amount:  float
    payment_status:  PaymentStatus
    transaction_ref: Optional[str]
    created_at:      datetime

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════
# TRACKING
# ══════════════════════════════════════════════════════════════════

class TrackingUpdate(BaseModel):
    tanker_id:  int
    latitude:   float
    longitude:  float
    speed_kmph: Optional[float] = None
    heading:    Optional[float] = None

    @field_validator("latitude")
    @classmethod
    def validate_lat(cls, v):
        if not (-90 <= v <= 90):
            raise ValueError("Latitude must be between -90 and 90")
        return v

    @field_validator("longitude")
    @classmethod
    def validate_lng(cls, v):
        if not (-180 <= v <= 180):
            raise ValueError("Longitude must be between -180 and 180")
        return v


class TrackingOut(BaseModel):
    tracking_id: int
    tanker_id:   int
    latitude:    float
    longitude:   float
    timestamp:   datetime
    speed_kmph:  Optional[float]
    heading:     Optional[float]

    model_config = {"from_attributes": True}


class LatestLocationOut(BaseModel):
    """Convenience schema: latest GPS fix for a tanker + recent history."""
    tanker_id:      int
    latest:         Optional[TrackingOut]
    recent_history: List[TrackingOut] = []   # last N points for polyline

    model_config = {"from_attributes": True}
