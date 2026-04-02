"""
main.py
-------
FastAPI application entry point.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI, Query, Depends, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import engine, Base, get_db
from app import models, schemas
from routers import users, companies, bookings, payments, tracking, recommendations

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter

# ── Create tables ─────────────────────────────────────
Base.metadata.create_all(bind=engine)

# ── FastAPI App ───────────────────────────────────────
app = FastAPI(
    title="💧 Water Tanker Booking Platform",
    description=(
        "Uber-like platform for booking water tanker deliveries.\n\n"
        "Supports user & company registration, tanker fleet management, "
        "booking, payments (UPI/COD/Partial), and live GPS tracking."
    ),
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────
# Note: allow_origins=["*"] + allow_credentials=True is invalid per the CORS
# spec and is rejected by all browsers. Use an explicit origins list instead.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # 🔥 IMPORTANT
    allow_credentials=False,  # 🔥 CHANGE THIS
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def home():
    return {"msg": "ok"}
# ── Rate Limiting ─────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── Versioned API Router ──────────────────────────────
api_v1 = APIRouter(prefix="/api/v1")

api_v1.include_router(users.router)
api_v1.include_router(companies.router)
api_v1.include_router(bookings.router)
api_v1.include_router(payments.router)
api_v1.include_router(tracking.router)
api_v1.include_router(recommendations.router)

app.include_router(api_v1)

# ── Map endpoint ──────────────────────────────────────
@app.get("/tankers-by-location", response_model=list[schemas.TankerLocationResult], tags=["Map"])
def get_tankers_by_location(
    city: str = Query(None, description="City to filter by (e.g., Pune)"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Company).filter(models.Company.is_active == True)

    if city:
        query = query.filter(models.Company.city.ilike(city))

    companies_list = query.all()
    results = []

    for c in companies_list:
        min_price = db.query(func.min(models.Tanker.price_per_delivery)).filter(
            models.Tanker.company_id == c.company_id
        ).scalar()

        max_cap = db.query(func.max(models.Tanker.capacity_liters)).filter(
            models.Tanker.company_id == c.company_id
        ).scalar()

        if min_price is None or max_cap is None:
            continue

        results.append(
            schemas.TankerLocationResult(
                name=c.company_name,
                capacity=max_cap,
                price=min_price,
                rating=c.rating,
                latitude=c.latitude,
                longitude=c.longitude,
                city=c.city,
                area=c.district,
            )
        )

    return results

# ── Health endpoints ──────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "water-tanker-api"}

@app.get("/", tags=["Health"])
def root():
    return {
        "message": "💧 Water Tanker Booking API",
        "docs": "/docs",
        "version": "1.0.0",
    }
