"""
routers/users.py
----------------
User registration and profile endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app import crud, schemas, auth, models
from app.limiter import limiter

router = APIRouter(prefix="/users", tags=["Users"])


@router.post(
    "/register",
    response_model=schemas.UserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
@limiter.limit("5/minute")
def register_user(request: Request, user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Register a new platform user.
    - Phone number must be unique (used as login identifier).
    - Email is optional but must be unique if provided.
    """
    # Check for duplicate phone
    if crud.get_user_by_phone(db, user.phone):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A user with phone {user.phone} already exists.",
        )
    try:
        return crud.create_user(db, user)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User with this phone or email already exists.",
        )


# ── Auth Endpoints ────────────────────────────────────────────────────────────

@router.post("/request-otp", summary="Request a login OTP")
@limiter.limit("3/minute")
def request_otp(request: Request, data: schemas.OTPRequest, db: Session = Depends(get_db)):
    """
    Send OTP to the given phone number.
    In this prototype, we just log it to console.
    """
    user = crud.get_user_by_phone(db, data.phone)
    if not user:
        raise HTTPException(status_code=404, detail="User not found. Please register first.")
    
    # MOCK OTP SENDING
    print(f"DEBUG: Sending OTP '1234' to {data.phone}")
    return {"message": "OTP sent successfully"}


@router.post("/verify-otp", response_model=schemas.Token, summary="Verify OTP and get JWT")
@limiter.limit("5/minute")
def verify_otp(request: Request, data: schemas.OTPVerify, db: Session = Depends(get_db)):
    """
    Verify the OTP and return a JWT access token.
    """
    # For prototype, only '1234' is valid
    if data.otp != "1234":
         raise HTTPException(status_code=401, detail="Invalid OTP")
    
    user = crud.get_user_by_phone(db, data.phone)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    access_token = auth.create_access_token(data={"sub": str(user.user_id)})
    return {"access_token": access_token, "token_type": "bearer"}


# ── Profile Endpoints ─────────────────────────────────────────────────────────

@router.get("/me", response_model=schemas.UserOut, summary="Get own profile")
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    """ Returns the currently logged in user based on the JWT token. """
    return current_user


@router.get(
    "/{user_id}",
    response_model=schemas.UserOut,
    summary="Get user profile by ID (Admin only or self)",
)
def get_user(
    user_id: int, 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(auth.get_current_user)
):
    """ Fixed IDOR by ensuring you can only access your own profile. """
    if current_user.user_id != user_id:
        raise HTTPException(status_code=403, detail="Forbidden: You can only access your own profile.")
    
    user = crud.get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
