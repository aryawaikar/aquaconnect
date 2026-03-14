"""
services/tracking_service.py
-----------------------------
Business logic for tanker GPS tracking.

In a real production system this would be backed by Redis for
low-latency latest-location lookups and a time-series DB for history.
For this project we use SQLite/PostgreSQL via SQLAlchemy.

The driver app (or a mock script) should POST to:
  POST /tracking/update_location
every ~5 seconds while the tanker is on the way.
"""

from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app import crud, models, schemas


def record_location(
    db: Session,
    data: schemas.TrackingUpdate,
) -> models.Tracking:
    """
    Persist a GPS coordinate update from a driver.
    Returns the saved Tracking record.
    """
    tracking = crud.upsert_tracking(db, data)
    return tracking


def get_tanker_live_location(
    db: Session,
    tanker_id: int,
    history_points: int = 20,
) -> schemas.LatestLocationOut:
    """
    Return the latest GPS fix + a short history trail for the given tanker.
    The history trail is used by the frontend to draw a polyline on Google Maps.
    """
    latest  = crud.get_latest_location(db, tanker_id)
    history = crud.get_recent_tracking_history(db, tanker_id, limit=history_points)

    return schemas.LatestLocationOut(
        tanker_id=tanker_id,
        latest=schemas.TrackingOut.model_validate(latest) if latest else None,
        recent_history=[
            schemas.TrackingOut.model_validate(t) for t in history
        ],
    )


def is_tanker_stale(
    db: Session,
    tanker_id: int,
    stale_after_seconds: int = 30,
) -> bool:
    """
    Returns True if no GPS update has been received within stale_after_seconds.
    Useful for alerting if a driver's GPS stops sending data.
    """
    latest = crud.get_latest_location(db, tanker_id)
    if not latest:
        return True
    elapsed = (datetime.utcnow() - latest.timestamp).total_seconds()
    return elapsed > stale_after_seconds
