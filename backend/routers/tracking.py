"""
routers/tracking.py
-------------------
GPS location tracking endpoints.

Driver app posts coordinates every ~5 seconds.
Frontend polls GET /tracking/{tanker_id} to update map marker.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas, auth, models
from services.tracking_service import record_location, get_tanker_live_location

router = APIRouter(prefix="/tracking", tags=["Tracking"])


@router.post(
    "/update_location",
    response_model=schemas.TrackingOut,
    summary="Driver posts current GPS location",
)
def update_location(
    data: schemas.TrackingUpdate, 
    db: Session = Depends(get_db),
    # In practice, this would be a driver token
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Called by the driver's mobile app. Stores a GPS coordinate record.
    """
    # Verify tanker exists
    if not crud.get_tanker_by_id(db, data.tanker_id):
        raise HTTPException(status_code=404, detail="Tanker not found")

    tracking = record_location(db, data)
    return tracking


@router.get(
    "/{tanker_id}",
    response_model=schemas.LatestLocationOut,
    summary="Get latest location + history trail for a tanker",
)
def get_location(
    tanker_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Returns latest location + history trail.
    Ensures that ONLY the user who booked this tanker can track it.
    """
    if not crud.get_tanker_by_id(db, tanker_id):
        raise HTTPException(status_code=404, detail="Tanker not found")

    # Security check: Does this user have a booking for this tanker?
    # We look for a booking that is NOT delivered or cancelled.
    bookings = crud.get_bookings_by_user(db, current_user.user_id)
    has_active_booking = any(
        b.tanker_id == tanker_id and b.booking_status not in (models.BookingStatus.delivered, models.BookingStatus.cancelled)
        for b in bookings
    )
    
    if not has_active_booking:
        raise HTTPException(status_code=403, detail="Forbidden: You can only track tankers for your active bookings")

    return get_tanker_live_location(db, tanker_id, history_points=20)
