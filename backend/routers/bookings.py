"""
routers/bookings.py
-------------------
Booking creation, retrieval, and status updates.
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas, models, auth

router = APIRouter(prefix="/bookings", tags=["Bookings"])


@router.post(
    "/create",
    response_model=schemas.BookingOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new water tanker booking",
)
def create_booking(
    booking: schemas.BookingCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Create a booking for the authenticated user.
    """
    # 1. Force the booking to be for the authenticated user (prevents IDOR)
    booking.user_id = current_user.user_id

    # Validate company exists
    if not crud.get_company_by_id(db, booking.company_id):
        raise HTTPException(status_code=404, detail="Company not found")

    tanker = crud.get_tanker_by_id(db, booking.tanker_id)
    if not tanker:
        raise HTTPException(status_code=404, detail="Tanker not found")

    # 2. Capacity match
    if tanker.capacity_liters != booking.capacity:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Tanker capacity ({tanker.capacity_liters}L) does not match requested capacity ({booking.capacity}L)",
        )

    # 3. Availability check
    if tanker.availability_status != models.AvailabilityStatus.available:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This tanker is not available. Please choose another.",
        )

    # 4. Create booking
    return crud.create_booking(db, booking)


@router.get(
    "/my-bookings",
    response_model=List[schemas.BookingOut],
    summary="Get all bookings for the logged-in user",
)
def get_my_bookings(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    return crud.get_bookings_by_user(db, current_user.user_id, skip=skip, limit=limit)


@router.get(
    "/company/{company_id}",
    response_model=List[schemas.BookingOut],
    summary="Get all bookings for a company",
)
def get_company_bookings(
    company_id: int,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
):
    if not crud.get_company_by_id(db, company_id):
        raise HTTPException(status_code=404, detail="Company not found")
    return crud.get_bookings_by_company(db, company_id, skip=skip, limit=limit)


@router.get(
    "/{booking_id}",
    response_model=schemas.BookingOut,
    summary="Get a single booking by ID (Owner only)",
)
def get_booking(
    booking_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = crud.get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    # Ownership Check
    if booking.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only view your own bookings")
    
    return booking


@router.patch(
    "/{booking_id}/status",
    response_model=schemas.BookingOut,
    summary="Update booking status (driver/company action)",
)
def update_status(
    booking_id: int,
    body: schemas.BookingStatusUpdate,
    db: Session = Depends(get_db),
):
    """
    Status transitions:
      scheduled → on_the_way → delivered
      Any status → cancelled
    When delivered, the tanker is automatically freed for new bookings.
    """
    booking = crud.update_booking_status(db, booking_id, body.booking_status)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    return booking
