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


CITY_CONFIG = {
    "Pune": [
        "Kothrud", "Baner", "Wakad", "Hinjewadi",
        "Shivajinagar", "Hadapsar", "Viman Nagar", "Katraj"
    ],
    "Mumbai": [
        "Andheri", "Bandra", "Borivali", "Colaba",
        "Juhu", "Powai", "Thane", "Navi Mumbai", "Dadar", "Worli"
    ]
}

def get_city_from_input(user_input: str) -> str:
    val = user_input.lower().strip()
    for city, areas in CITY_CONFIG.items():
        if city.lower() == val:
            return city
        for area in areas:
            if area.lower() == val:
                return city
    return "Pune"  # Default fallback


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
) -> dict:
    """
    Main entry point.

    1. Fetch all active companies and filter by area using partial string
       matching on district/city columns. This handles inputs like "Kothrud"
       matching a company whose district is "Kothrud" and city is "Pune".
    2. Include companies even if they don't have the exact requested capacity;
       fall back to any available tanker so results are never empty.
    3. Build a feature vector, normalize, score, and sort.
    """
    weights = weights or DEFAULT_WEIGHTS

    user_input_loc = district.strip()
    user_city = get_city_from_input(user_input_loc)
    area = user_input_loc.lower()

    # DEBUG
    print(f"Search Debug -> location_input={user_input_loc!r}, target_city={user_city!r}, capacity={capacity}")
    print(f"User area: {area}")

    # Step 1: Fetch all active companies, then apply flexible area-based filtering.
    # Handles inputs like "Kothrud" matching district="Kothrud" or city="Pune".
    all_active = (
        db.query(models.Company)
        .filter(models.Company.is_active == True)          # noqa: E712
        .all()
    )

    print(f"Total tankers: {len(all_active)}")

    companies = [
        c for c in all_active
        if area in (c.district or "").lower()
        or area in (c.city or "").lower()
    ]

    # Fallback 1: match by resolved city name
    if not companies:
        city_lower = user_city.lower()
        companies = [
            c for c in all_active
            if city_lower in (c.city or "").lower()
            or city_lower in (c.district or "").lower()
        ]

    # Fallback 2 (last resort): first 20 active companies
    if not companies:
        companies = all_active[:20]

    print(f"Filtered: {len(companies)}")
    print(f"  -> {len(companies)} companies found in total")

    # Step 2: Build raw feature data.
    # Prefer exact capacity match, but fall back to any available tanker
    # so that companies are never silently excluded.
    candidates = []
    for company in companies:
        price = crud.get_min_price_for_capacity(db, company.company_id, capacity)
        avail_count = crud.count_available_tankers(db, company.company_id, capacity)

        if price is None or avail_count == 0:
            # Try any available tanker from this company
            any_avail = (
                db.query(models.Tanker)
                .filter(
                    models.Tanker.company_id == company.company_id,
                    models.Tanker.availability_status == models.AvailabilityStatus.available,
                )
                .first()
            )
            if any_avail:
                if price is None:
                    price = any_avail.price_per_delivery
                if avail_count == 0:
                    avail_count = 1
            else:
                # No available tankers at all; still include with avail=0
                any_tanker = (
                    db.query(models.Tanker)
                    .filter(models.Tanker.company_id == company.company_id)
                    .first()
                )
                if price is None:
                    price = any_tanker.price_per_delivery if any_tanker else 0.0
                avail_count = 0

        distance = _get_distance_km(company, district, user_lat, user_lng)

        candidates.append({
            "company":      company,
            "price":        price or 0.0,
            "distance":     distance,
            "availability": avail_count,
            "rating":       company.rating or 0.0,
            "district":     company.district,
            "city":         company.city,
        })

    if not candidates:
        print("  -> No candidates found at all")
        return []

    print(f"  -> {len(candidates)} candidates with capacity={capacity}L")

    # Step 3: Extract vectors for normalization
    prices         = [c["price"]        for c in candidates]
    distances      = [c["distance"]     for c in candidates]
    availabilities = [c["availability"] for c in candidates]
    ratings        = [c["rating"]       for c in candidates]

    norm_prices         = _normalize(prices)
    norm_distances      = _normalize(distances)
    norm_availabilities = _normalize(availabilities)
    norm_ratings        = _normalize(ratings)

    def score_tanker(user_input: str, company) -> int:
        loc_score = 0
        tanker_loc = f"{company.district} {company.city}".lower()
        u_input = user_input.lower()
        
        # Extract city from user input (naive approach: last word)
        city = u_input.split()[-1] if u_input else ""

        # 1. Exact match
        if tanker_loc == u_input:
            loc_score += 120
            
        # 2. Partial match
        if u_input and (u_input in tanker_loc):
            loc_score += 80
            
        # 3. Same city
        if city and (city in tanker_loc):
            loc_score += 40
            
        return loc_score

    # Step 4: Score each candidate
    results = []
    for i, c in enumerate(candidates):
        base_score = (
            weights["price"]        * (1 - norm_prices[i])        # cheaper  = better
            + weights["distance"]   * (1 - norm_distances[i])     # closer   = better
            + weights["availability"] * norm_availabilities[i]    # more available = better
            + weights["rating"]     * norm_ratings[i]             # higher rating  = better
        )
        
        company = c["company"]
        location_boost = score_tanker(user_input_loc, company)
        final_score = base_score + location_boost

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
                score=round(final_score, 4),
            )
        )

    # Step 5: Sort by score descending (best match first)
    results.sort(key=lambda r: r.score, reverse=True)
    
    # Split
    return {
        "recommendations": results[:3],
        "others": results[3:]
    }

