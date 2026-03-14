"""
routers/companies.py
--------------------
Company registration, listing, tanker management, and filtering.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db
from app import crud, schemas
from services.recommendation import rank_companies

router = APIRouter(prefix="/companies", tags=["Companies"])


# ───────────────── SEARCH / FILTER COMPANIES ─────────────────
# MUST COME BEFORE /{company_id}

@router.get(
    "/search",
    response_model=List[schemas.CompanyFilterResult],
    summary="Search companies by district, capacity and time slot"
)
@router.get(
    "/filter",
    response_model=List[schemas.CompanyFilterResult],
    summary="Filter companies (alias for /search)",
    include_in_schema=False,
)
def search_companies(
    district: str = Query(..., description="City e.g Pune"),
    capacity: int = Query(..., description="3000 / 5000 / 8000 / 10000"),
    timeslot: str = Query("", description="Time slot e.g 10:00-12:00 (optional)"),
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    db: Session = Depends(get_db),
):

    allowed_capacities = (3000, 5000, 8000, 10000)

    if capacity not in allowed_capacities:
        raise HTTPException(
            status_code=422,
            detail=f"capacity must be one of {allowed_capacities}",
        )

    if timeslot:
        import re
        if not re.match(r"^\d{2}:\d{2}-\d{2}:\d{2}$", timeslot):
            raise HTTPException(
                status_code=422,
                detail="timeslot must be in format HH:MM-HH:MM",
            )

    results = rank_companies(
        db=db,
        district=district,
        capacity=capacity,
        timeslot=timeslot,
        user_lat=user_lat,
        user_lng=user_lng,
    )

    return results if results else []


# ───────────────── COMPANY REGISTRATION ─────────────────

@router.post(
    "/register",
    response_model=schemas.CompanyOut,
    status_code=status.HTTP_201_CREATED,
)
def register_company(company: schemas.CompanyCreate, db: Session = Depends(get_db)):
    try:
        return crud.create_company(db, company)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Company with this phone or email already exists.",
        )


# ───────────────── LIST COMPANIES ─────────────────

@router.get(
    "",
    response_model=List[schemas.CompanyOut],
)
def list_companies(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
):
    return crud.get_all_companies(db, skip=skip, limit=limit)


# ───────────────── GET COMPANY BY ID ─────────────────

@router.get(
    "/{company_id}",
    response_model=schemas.CompanyOut,
)
def get_company(company_id: int, db: Session = Depends(get_db)):
    company = crud.get_company_by_id(db, company_id)

    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    return company


# ───────────────── ADD TANKER ─────────────────

@router.post(
    "/tankers",
    response_model=schemas.TankerOut,
    status_code=status.HTTP_201_CREATED,
)
def add_tanker(tanker: schemas.TankerCreate, db: Session = Depends(get_db)):

    if not crud.get_company_by_id(db, tanker.company_id):
        raise HTTPException(status_code=404, detail="Company not found")

    try:
        return crud.create_tanker(db, tanker)
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Vehicle number already exists.",
        )