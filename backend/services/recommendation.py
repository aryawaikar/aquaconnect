"""
services/recommendation.py
---------------------------
Recommendation engine for ranking water tanker companies.

Algorithm
---------
Each company gets a composite score between 0 and 1.
Higher score = better recommendation.

Score formula:
  score = w_price * norm_price_inv
        + w_distance * norm_dist_inv
        + w_availability * norm_avail
        + w_rating * norm_rating

Where:
  norm_price_inv    = 1 - normalized_price   (cheaper → higher score)
  norm_dist_inv     = 1 - normalized_distance (closer  → higher score)
  norm_avail        = normalized availability count
  norm_rating       = normalized rating

Default weights (configurable):
  price        = 0.40
  distance     = 0.30
  availability = 0.20
  rating       = 0.10
"""

from typing import Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from geopy.distance import geodesic

from app import crud, models, schemas


# ── District centroid coordinates (approximate GPS centers for Pune) ──────────
# Used to compute straight-line distance when exact user GPS is not available.
DISTRICT_CENTROIDS: dict[str, Tuple[float, float]] = {
    "kothrud":       (18.5074, 73.8077),
    "baner":         (18.5590, 73.7868),
    "wakad":         (18.5988, 73.7601),
    "hinjewadi":     (18.5912, 73.7389),
    "shivajinagar":  (18.5308, 73.8474),
    "hadapsar":      (18.5018, 73.9260),
    "viman nagar":   (18.5679, 73.9143),
    "katraj":        (18.4530, 73.8567),
}

# Default weights — must sum to 1.0
DEFAULT_WEIGHTS = {
    "price":        0.40,
    "distance":     0.30,
    "availability": 0.20,
    "rating":       0.10,
}


def _normalize(values: List[float]) -> List[float]:
    """Min-max normalize a list to [0, 1]. Returns zeros if all values are equal."""
    if not values:
        return []
    min_v, max_v = min(values), max(values)
    if max_v == min_v:
        return [0.5] * len(values)          # all same → neutral score
    return [(v - min_v) / (max_v - min_v) for v in values]


def _get_distance_km(
    company: models.Company,
    user_district: str,
    user_lat: Optional[float],
    user_lng: Optional[float],
) -> float:
    """
    Compute approximate distance between company and user.
    Priority:
      1. Use exact user GPS if provided
      2. Fall back to district centroid lookup
      3. Return 0 if nothing is available
    """
    # Company GPS
    if company.latitude is None or company.longitude is None:
        return 0.0

    company_coords = (company.latitude, company.longitude)

    # Exact user GPS
    if user_lat is not None and user_lng is not None:
        return geodesic(company_coords, (user_lat, user_lng)).km

    # Fallback to district centroid
    centroid = DISTRICT_CENTROIDS.get(user_district.lower())
    if centroid:
        return geodesic(company_coords, centroid).km

    return 0.0


def rank_companies(
    db: Session,
    district: str,           # frontend sends the city name here (e.g. "Mumbai")
    capacity: int,
    timeslot: str,           # accepted for API compatibility; not used for filtering
    user_lat: Optional[float] = None,
    user_lng: Optional[float] = None,
    weights: Optional[Dict[str, float]] = None,
) -> List[schemas.CompanyFilterResult]:
    """
    Main entry point.

    1. Fetch all active companies whose city matches the requested city.
       (The API param is named 'district' for legacy reasons; the value is
        actually a city name like 'Mumbai' or 'Pune'.)
    2. Keep only those that have at least one tanker of the requested capacity.
       Timeslot is intentionally ignored — tankers do not store timeslot
       availability in this demo system.
    3. Build a feature vector, normalize, score, and sort.
    """
    weights = weights or DEFAULT_WEIGHTS

    city_query = district.strip()
    print(f"Search Debug → city={city_query!r}, capacity={capacity}, timeslot={timeslot!r} (ignored)")

    # Step 1: Get all active companies in the requested city
    # Filter by city column (case-insensitive), NOT the district sub-area column.
    companies = (
        db.query(models.Company)
        .filter(
            models.Company.city.ilike(city_query),
            models.Company.is_active == True,          # noqa: E712
        )
        .all()
    )

    if not companies:
        print(f"  → No companies found for city={city_query!r}")
        return []

    print(f"  → {len(companies)} companies found in city={city_query!r}")

    # Step 2: Build raw feature data — filter by capacity, ignore timeslot
    candidates = []
    for company in companies:
        # Get lowest price for this capacity (None = company doesn't offer it)
        price = crud.get_min_price_for_capacity(db, company.company_id, capacity)
        if price is None:
            continue  # company has no tankers of this capacity

        avail_count = crud.count_available_tankers(db, company.company_id, capacity)
        if avail_count == 0:
            continue
        
        distance    = _get_distance_km(company, district, user_lat, user_lng)

        candidates.append({
            "company":      company,
            "price":        price,
            "distance":     distance,
            "availability": avail_count,
            "rating":       company.rating,
        })

    if not candidates:
        print(f"  → No candidates with capacity={capacity}L")
        return []

    print(f"  → {len(candidates)} candidates with capacity={capacity}L")

    # Step 3: Extract vectors for normalization
    prices         = [c["price"]        for c in candidates]
    distances      = [c["distance"]     for c in candidates]
    availabilities = [c["availability"] for c in candidates]
    ratings        = [c["rating"]       for c in candidates]

    norm_prices         = _normalize(prices)
    norm_distances      = _normalize(distances)
    norm_availabilities = _normalize(availabilities)
    norm_ratings        = _normalize(ratings)

    # Step 4: Score each candidate
    results = []
    for i, c in enumerate(candidates):
        score = (
            weights["price"]        * (1 - norm_prices[i])        # cheaper  = better
            + weights["distance"]   * (1 - norm_distances[i])     # closer   = better
            + weights["availability"] * norm_availabilities[i]    # more available = better
            + weights["rating"]     * norm_ratings[i]             # higher rating  = better
        )

        company = c["company"]
        results.append(
            schemas.CompanyFilterResult(
                company_id=company.company_id,
                company_name=company.company_name,
                district=company.district,
                city=company.city,
                phone=company.phone,
                rating=company.rating,
                price=c["price"],
                capacity=capacity,
                available_tankers=c["availability"],
                distance_km=round(c["distance"], 2) if c["distance"] else None,
                score=round(score, 4),
            )
        )

    # Step 5: Sort by score descending (best match first)
    results.sort(key=lambda r: r.score, reverse=True)
    return results

