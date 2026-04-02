"""
routers/recommendations.py
--------------------------
GET /recommendations — returns top-5 ranked tanker companies for a user query.

Reuses the existing rank_companies() scoring engine from services/recommendation.py.
No duplicate logic here — just validation + limit.
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import schemas
from services.recommendation import rank_companies

router = APIRouter(prefix="/recommendations", tags=["Recommendations"])

_VALID_CAPACITIES = (3000, 5000, 8000, 10000)
_TOP_N = 5


@router.get(
    "",
    response_model=schemas.RecommendationSplitResult,
    summary="Get top-3 recommended tanker companies and remaining list",
    description=(
        "Returns up to 5 best-matching tanker companies ranked by a weighted score "
        "(40% price, 40% distance, 20% capacity match). "
        "Lower score = worse; higher = better."
    ),
)
def get_recommendations(
    capacity: int = Query(..., description="Required water capacity: 3000 / 5000 / 8000 / 10000 litres"),
    district: str = Query(..., description="City / district name e.g. 'Pune'"),
    user_lat: Optional[float] = Query(None, description="User GPS latitude (optional, improves distance accuracy)"),
    user_lng: Optional[float] = Query(None, description="User GPS longitude (optional, improves distance accuracy)"),
    db: Session = Depends(get_db),
):
    # ── Input validation ──────────────────────────────────────────────────────
    if capacity not in _VALID_CAPACITIES:
        raise HTTPException(
            status_code=422,
            detail=f"'capacity' must be one of {_VALID_CAPACITIES}. Got: {capacity}",
        )

    district = district.strip()
    if not district:
        raise HTTPException(status_code=422, detail="'district' must not be empty.")

    # ── Score & rank ──────────────────────────────────────────────────────────
    ranked = rank_companies(
        db=db,
        district=district,
        capacity=capacity,
        timeslot="",           # recommendations don't need timeslot filtering
        user_lat=user_lat,
        user_lng=user_lng,
    )

    # ── Map to response models ────────────────────────────────────────────────
    mapped_recos = [
        schemas.RecommendationResult(
            company_id=r.company_id,
            company_name=r.company_name,
            district=r.district,
            city=r.city,
            price=r.price,
            capacity=r.capacity,
            distance_km=r.distance_km,
            rating=r.rating,
            available_tankers=r.available_tankers,
            score=r.score,
        )
        for r in ranked.get("recommendations", [])
    ]

    mapped_others = [
        schemas.RecommendationResult(
            company_id=r.company_id,
            company_name=r.company_name,
            district=r.district,
            city=r.city,
            price=r.price,
            capacity=r.capacity,
            distance_km=r.distance_km,
            rating=r.rating,
            available_tankers=r.available_tankers,
            score=r.score,
        )
        for r in ranked.get("others", [])
    ]

    return schemas.RecommendationSplitResult(
        recommendations=mapped_recos,
        others=mapped_others
    )
