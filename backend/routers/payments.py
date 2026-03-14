"""
routers/payments.py
-------------------
Payment creation and confirmation.

Payment types supported:
  - upi              → mock UPI transaction
  - cash_on_delivery → payment at delivery
  - partial_advance  → pay advance now, rest on delivery
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import crud, schemas, models, auth

router = APIRouter(prefix="/payments", tags=["Payments"])


@router.post(
    "/create",
    response_model=schemas.PaymentOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a payment for a booking",
)
def create_payment(
    payment: schemas.PaymentCreate, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """
    Create a payment record linked to a booking.
    """
    # Verify booking exists and belongs to the user
    booking = crud.get_booking_by_id(db, payment.booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only pay for your own bookings")

    # Check if payment already exists for this booking
    existing = crud.get_payment_by_booking(db, payment.booking_id)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A payment already exists for this booking.",
        )

    # Partial advance validation
    if payment.payment_type == models.PaymentType.partial_advance:
        if payment.advance_amount <= 0:
            raise HTTPException(
                status_code=422,
                detail="advance_amount must be > 0 for partial_advance payments",
            )
        if payment.advance_amount >= payment.amount:
            raise HTTPException(
                status_code=422,
                detail="advance_amount must be less than total amount",
            )

    return crud.create_payment(db, payment)


@router.get(
    "/booking/{booking_id}",
    response_model=schemas.PaymentOut,
    summary="Get payment details for a booking (Owner only)",
)
def get_payment(
    booking_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    booking = crud.get_booking_by_id(db, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    if booking.user_id != current_user.user_id:
        raise HTTPException(status_code=403, detail="Forbidden: Access denied")

    payment = crud.get_payment_by_booking(db, booking_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found for this booking")
    return payment


@router.post(
    "/{payment_id}/confirm",
    response_model=schemas.PaymentOut,
    summary="Confirm/complete a payment (mock webhook)",
)
def confirm_payment(
    payment_id: int,
    transaction_ref: str,
    db: Session = Depends(get_db),
):
    """
    Mark a payment as completed.
    In production this would be called by a UPI/payment gateway webhook.
    For now it's a manual endpoint for testing.
    """
    payment = crud.complete_payment(db, payment_id, transaction_ref)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment
