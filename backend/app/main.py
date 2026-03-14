"""
main.py
-------
FastAPI application entry point.

Responsibilities:
  - Create the FastAPI app instance
  - Create all DB tables on startup
  - Register all routers
  - Configure CORS for React frontend
  - Expose /health endpoint

Run locally:
  uvicorn app.main:app --reload --port 8000
"""

import sys
import os

# Ensure the backend root is on the Python path so routers can import services
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import engine, Base, get_db
from app import models, schemas
from fastapi import Query, Depends
from sqlalchemy.orm import Session
from routers import users, companies, bookings, payments, tracking

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from app.limiter import limiter

# ── Create all tables (dev convenience — use Alembic in production) ────────────
Base.metadata.create_all(bind=engine)

# ── App instance ──────────────────────────────────────────────────────────────
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
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ──────────────────────────────────────────────────────────────────────
# "null" covers file:// origins (browsers send Origin: null for local files)
_env_origins = os.getenv("ALLOWED_ORIGINS", "")
IF_dev_origins = [
    "http://localhost:3000",
    "http://localhost:8001",
    "http://127.0.0.1:8001",
    "http://127.0.0.1:3000",
    "null",   # file:// pages send Origin: null
]
allowed_origins = [o.strip() for o in _env_origins.split(",") if o.strip()] or IF_dev_origins

# Always include null so file:// frontend works in dev
if "null" not in allowed_origins:
    allowed_origins.append("null")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register routers ──────────────────────────────────────────────────────────
# ── Versioned Routes (/api/v1) ────────────────────────────────────────────────
api_v1 = FastAPI()

api_v1.include_router(users.router)
api_v1.include_router(companies.router)
api_v1.include_router(bookings.router)
api_v1.include_router(payments.router)
api_v1.include_router(tracking.router)

app.mount("/api/v1", api_v1)

# ── Map endpoint ──────────────────────────────────────────────────────────────
@app.get("/tankers-by-location", response_model=list[schemas.TankerLocationResult], tags=["Map"])
def get_tankers_by_location(
    city: str = Query(None, description="City to filter by (e.g., Pune)"),
    db: Session = Depends(get_db),
):
    query = db.query(models.Company).filter(models.Company.is_active == True)
    if city:
        query = query.filter(models.Company.city.ilike(city))
    
    companies = query.all()
    results = []
    
    for c in companies:
        # Get lowest price across all capacities (if any) or a default
        from sqlalchemy import func
        min_price = db.query(func.min(models.Tanker.price_per_delivery)).filter(
            models.Tanker.company_id == c.company_id
        ).scalar()
        
        # Get max capacity for display
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


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    """Simple liveness probe. Load balancers / Kubernetes use this."""
    return {"status": "ok", "service": "water-tanker-api"}


@app.get("/", tags=["Health"])
def root():
    return {
        "message": "💧 Water Tanker Booking API",
        "docs": "/docs",
        "version": "1.0.0",
    }
