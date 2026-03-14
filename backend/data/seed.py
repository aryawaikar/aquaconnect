"""
data/seed.py
------------
AquaConnect — Realistic Mock Dataset Generator

Generates:
  Cities     : 4  (Pune, Mumbai, Delhi, Bangalore)
  Companies  : 25 per city → 100 total
  Tankers    : 12 per company (3 per capacity × 4 capacities) → 1,200 total
  Users      : 200 (50 per city)
  Bookings   : 160 (40 per city)
  Payments   : 160 (one per booking)

Capacities : 3000L, 5000L, 8000L, 10000L
Tankers/cap: 3 per company

Run from the backend/ directory:
  python data/seed.py
"""

import sys
import os
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from faker import Faker
from sqlalchemy.orm import Session

from app.database import SessionLocal, engine, Base
from app import models

fake = Faker("en_IN")
random.seed(42)   # reproducible dataset

# ══════════════════════════════════════════════════════════════════
# CITY CONFIGURATION
# ══════════════════════════════════════════════════════════════════

CITY_CONFIG = {
    "Pune": {
        "rto_code": "MH12",
        "districts": [
            "Kothrud", "Baner", "Wakad", "Hinjewadi",
            "Shivajinagar", "Hadapsar", "Viman Nagar", "Katraj",
        ],
        "bounds": {
            "Kothrud":      (18.495, 18.520, 73.800, 73.830),
            "Baner":        (18.550, 18.570, 73.775, 73.800),
            "Wakad":        (18.585, 18.610, 73.745, 73.775),
            "Hinjewadi":    (18.580, 18.605, 73.720, 73.755),
            "Shivajinagar": (18.522, 18.542, 73.838, 73.865),
            "Hadapsar":     (18.488, 18.512, 73.910, 73.945),
            "Viman Nagar":  (18.558, 18.578, 73.898, 73.928),
            "Katraj":       (18.440, 18.465, 73.845, 73.875),
        },
        "name_templates": [
            "{name} Aqua Supply", "{name} Water Services", "Pune {name} Tankers",
            "{name} Hydro Solutions", "AquaPune {name}", "{name} Water Carriers",
            "Pune Aqua {name}", "{name} H2O Services", "{name} Water Logistics",
        ],
    },
    "Mumbai": {
        "rto_code": "MH01",
        "districts": [
            "Andheri", "Bandra", "Kurla", "Thane",
            "Borivali", "Dadar", "Goregaon", "Malad",
        ],
        "bounds": {
            "Andheri":  (19.109, 19.135, 72.826, 72.870),
            "Bandra":   (19.050, 19.072, 72.820, 72.850),
            "Kurla":    (19.065, 19.085, 72.875, 72.900),
            "Thane":    (19.195, 19.225, 72.960, 73.005),
            "Borivali": (19.225, 19.255, 72.840, 72.875),
            "Dadar":    (19.016, 19.032, 72.838, 72.858),
            "Goregaon": (19.152, 19.175, 72.843, 72.872),
            "Malad":    (19.183, 19.205, 72.836, 72.866),
        },
        "name_templates": [
            "{name} Mumbai Tankers", "Mumbai {name} Water Co.", "{name} Aqua Fleet",
            "{name} Water Tankers", "MaxiWater {name}", "{name} H2O Mumbai",
            "Mumbai {name} Hydro", "{name} Water Express", "AquaMax {name}",
        ],
    },
    "Delhi": {
        "rto_code": "DL01",
        "districts": [
            "Dwarka", "Rohini", "Lajpat Nagar", "Saket",
            "Janakpuri", "Pitampura", "Vasant Kunj", "Mayur Vihar",
        ],
        "bounds": {
            "Dwarka":       (28.568, 28.600, 77.009, 77.060),
            "Rohini":       (28.714, 28.745, 77.105, 77.145),
            "Lajpat Nagar": (28.563, 28.575, 77.232, 77.255),
            "Saket":        (28.520, 28.540, 77.203, 77.228),
            "Janakpuri":    (28.620, 28.645, 77.072, 77.100),
            "Pitampura":    (28.695, 28.720, 77.128, 77.155),
            "Vasant Kunj":  (28.515, 28.538, 77.148, 77.175),
            "Mayur Vihar":  (28.605, 28.625, 77.285, 77.315),
        },
        "name_templates": [
            "{name} Hydro Logistics", "Delhi {name} Water Supply", "{name} Aqua Delhi",
            "{name} Water Transport", "DelhiHydro {name}", "{name} H2O Logistics",
            "Capital {name} Water", "{name} Water Delhi", "{name} Hydro Express",
        ],
    },
    "Bangalore": {
        "rto_code": "KA01",
        "districts": [
            "Koramangala", "Whitefield", "Indiranagar", "Jayanagar",
            "Electronic City", "HSR Layout", "Marathahalli", "Yelahanka",
        ],
        "bounds": {
            "Koramangala":     (12.927, 12.942, 77.612, 77.640),
            "Whitefield":      (12.963, 12.995, 77.735, 77.775),
            "Indiranagar":     (12.970, 12.985, 77.635, 77.660),
            "Jayanagar":       (12.920, 12.940, 77.575, 77.600),
            "Electronic City": (12.835, 12.862, 77.655, 77.690),
            "HSR Layout":      (12.905, 12.925, 77.630, 77.658),
            "Marathahalli":    (12.952, 12.972, 77.693, 77.720),
            "Yelahanka":       (13.090, 13.120, 77.585, 77.620),
        },
        "name_templates": [
            "{name} Aqua Fleet", "Bangalore {name} Water", "{name} Hydro Bangalore",
            "{name} Water Solutions", "BengaluruAqua {name}", "{name} H2O Fleet",
            "Garden City {name} Water", "{name} Aqua Logistics", "{name} Water Bangalore",
        ],
    },
}

# ══════════════════════════════════════════════════════════════════
# TANKER CAPACITY + PRICING BANDS
# ══════════════════════════════════════════════════════════════════

CAPACITY_PRICE_RANGE = {
    3000:  (500,  700),
    5000:  (700,  900),
    8000:  (900,  1200),
    10000: (1200, 1500),
}

TANKERS_PER_CAPACITY = 3   # 3 tankers x 4 capacities = 12 per company
COMPANIES_PER_CITY   = 25
USERS_PER_CITY       = 50
BOOKINGS_PER_CITY    = 40

TIMESLOTS = [
    "06:00-08:00", "08:00-10:00", "10:00-12:00",
    "12:00-14:00", "14:00-16:00", "16:00-18:00",
]
PAYMENT_TYPES = ["upi", "cash_on_delivery", "partial_advance"]


# ══════════════════════════════════════════════════════════════════
# HELPERS
# ══════════════════════════════════════════════════════════════════

def random_gps(city, district):
    bounds = CITY_CONFIG[city]["bounds"].get(district)
    if not bounds:
        return (0.0, 0.0)
    return (
        round(random.uniform(bounds[0], bounds[1]), 6),
        round(random.uniform(bounds[2], bounds[3]), 6),
    )


def unique_phone(used):
    while True:
        prefix = random.choice(["6", "7", "8", "9"])
        phone  = prefix + "".join(str(random.randint(0, 9)) for _ in range(9))
        if phone not in used:
            used.add(phone)
            return phone


def unique_email(used):
    while True:
        email = fake.email()
        if email not in used:
            used.add(email)
            return email


def unique_vehicle_number(used, rto_code):
    letters = "ABCDEFGHJKLMNPQRSTUVWXYZ"
    while True:
        vnum = (
            f"{rto_code}"
            f"{random.choice(letters)}{random.choice(letters)}"
            f"{random.randint(1000, 9999)}"
        )
        if vnum not in used:
            used.add(vnum)
            return vnum


def make_company_name(templates, used_names):
    for _ in range(100):
        name = random.choice(templates).format(name=fake.last_name())
        if name not in used_names:
            used_names.add(name)
            return name
    # Fallback with numeric suffix to guarantee uniqueness
    name = f"{fake.last_name()} Water Services {random.randint(1, 9999)}"
    used_names.add(name)
    return name


# ══════════════════════════════════════════════════════════════════
# MAIN SEED FUNCTION
# ══════════════════════════════════════════════════════════════════

def seed_database():
    total_companies = len(CITY_CONFIG) * COMPANIES_PER_CITY
    total_tankers   = total_companies * len(CAPACITY_PRICE_RANGE) * TANKERS_PER_CAPACITY

    print("💧 AquaConnect — Starting database seed...")
    print(f"   Target → {total_companies} companies | {total_tankers} tankers\n")

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    phones_used   = set()
    emails_used   = set()
    vehicles_used = set()
    all_users     = []
    all_companies = []
    all_tankers   = []
    all_bookings  = []

    try:
        # ── Step 1: Users (50 per city) ───────────────────────────────────────
        print("── Step 1: Users ──")
        city_users = {}
        for city, cfg in CITY_CONFIG.items():
            city_users[city] = []
            for _ in range(USERS_PER_CITY):
                district = random.choice(cfg["districts"])
                user = models.User(
                    name=fake.name(),
                    phone=unique_phone(phones_used),
                    email=unique_email(emails_used),
                    address=fake.street_address(),
                    district=district,
                    city=city,
                )
                db.add(user)
                city_users[city].append(user)
                all_users.append(user)
        db.commit()
        for u in all_users:
            db.refresh(u)
        print(f"  OK  {len(all_users)} users  ({USERS_PER_CITY}/city x {len(CITY_CONFIG)} cities)\n")

        # ── Step 2: Companies (25 per city) ───────────────────────────────────
        print("── Step 2: Companies ──")
        city_companies = {}
        for city, cfg in CITY_CONFIG.items():
            city_companies[city] = []
            used_names = set()
            districts  = cfg["districts"]
            templates  = cfg["name_templates"]

            for i in range(COMPANIES_PER_CITY):
                district     = districts[i % len(districts)]
                lat, lng     = random_gps(city, district)
                company_name = make_company_name(templates, used_names)

                company = models.Company(
                    company_name=company_name,
                    owner_name=fake.name(),
                    phone=unique_phone(phones_used),
                    email=unique_email(emails_used),
                    district=district,
                    city=city,
                    latitude=lat,
                    longitude=lng,
                    rating=round(random.uniform(3.0, 5.0), 1),
                )
                db.add(company)
                city_companies[city].append(company)
                all_companies.append(company)

            print(f"  OK  {city:<12}: {COMPANIES_PER_CITY} companies")

        db.commit()
        for c in all_companies:
            db.refresh(c)
        print(f"  Total: {len(all_companies)} companies\n")

        # ── Step 3: Tankers (3 per capacity x 4 capacities = 12 per company) ─
        print("── Step 3: Tankers ──")
        city_tankers = {}
        for city, cfg in CITY_CONFIG.items():
            city_tankers[city] = []
            rto_code = cfg["rto_code"]

            for company in city_companies[city]:
                for capacity, (pmin, pmax) in CAPACITY_PRICE_RANGE.items():
                    for _ in range(TANKERS_PER_CAPACITY):
                        tanker = models.Tanker(
                            company_id=company.company_id,
                            capacity_liters=capacity,
                            vehicle_number=unique_vehicle_number(vehicles_used, rto_code),
                            availability_status=models.AvailabilityStatus.available,
                            price_per_delivery=round(random.uniform(pmin, pmax), 2),
                        )
                        db.add(tanker)
                        city_tankers[city].append(tanker)
                        all_tankers.append(tanker)

            n = len(city_tankers[city])
            print(f"  OK  {city:<12}: {n} tankers  "
                  f"({COMPANIES_PER_CITY} co. x {len(CAPACITY_PRICE_RANGE)} caps x {TANKERS_PER_CAPACITY})")

        db.commit()
        for t in all_tankers:
            db.refresh(t)

        # Update vehicle counts
        for c in all_companies:
            c.number_of_vehicles = len(CAPACITY_PRICE_RANGE) * TANKERS_PER_CAPACITY
        db.commit()

        print(f"  Total: {len(all_tankers)} tankers\n")
        print("  Breakdown by capacity:")
        for cap, (pmin, pmax) in CAPACITY_PRICE_RANGE.items():
            n = sum(1 for t in all_tankers if t.capacity_liters == cap)
            print(f"    {cap:>6}L  {n:>4} tankers   price range Rs.{pmin}-{pmax}")
        print()

        # ── Step 4: Bookings (40 per city) ────────────────────────────────────
        print("── Step 4: Bookings ──")
        for city in CITY_CONFIG:
            company_map = {c.company_id: c for c in city_companies[city]}
            for _ in range(BOOKINGS_PER_CITY):
                user    = random.choice(city_users[city])
                tanker  = random.choice(city_tankers[city])
                company = company_map[tanker.company_id]
                bdate   = (datetime.now() - timedelta(days=random.randint(0, 30))).strftime("%Y-%m-%d")
                status  = random.choice([
                    models.BookingStatus.scheduled,
                    models.BookingStatus.on_the_way,
                    models.BookingStatus.delivered,
                ])
                booking = models.Booking(
                    user_id=user.user_id,
                    company_id=company.company_id,
                    tanker_id=tanker.tanker_id,
                    capacity=tanker.capacity_liters,
                    timeslot=random.choice(TIMESLOTS),
                    booking_date=bdate,
                    booking_status=status,
                    delivery_address=fake.street_address() + f", {user.district}, {city}",
                )
                db.add(booking)
                all_bookings.append(booking)
            print(f"  OK  {city:<12}: {BOOKINGS_PER_CITY} bookings")

        db.commit()
        for b in all_bookings:
            db.refresh(b)
        print(f"  Total: {len(all_bookings)} bookings\n")

        # ── Step 5: Payments ──────────────────────────────────────────────────
        print("── Step 5: Payments ──")
        tanker_lookup = {t.tanker_id: t for t in all_tankers}
        for booking in all_bookings:
            tanker  = tanker_lookup[booking.tanker_id]
            ptype   = random.choice(PAYMENT_TYPES)
            amount  = tanker.price_per_delivery
            advance = round(amount * random.uniform(0.25, 0.40), 2) if ptype == "partial_advance" else 0.0
            pstatus = (
                models.PaymentStatus.completed
                if booking.booking_status == models.BookingStatus.delivered
                else models.PaymentStatus.pending
            )
            db.add(models.Payment(
                booking_id=booking.booking_id,
                payment_type=models.PaymentType(ptype),
                amount=amount,
                advance_amount=advance,
                payment_status=pstatus,
                transaction_ref=(
                    f"TXN{random.randint(100000, 999999)}"
                    if pstatus == models.PaymentStatus.completed else None
                ),
            ))
        db.commit()
        print(f"  OK  {len(all_bookings)} payment records\n")

        # ── Step 6: GPS Tracking (active tankers only) ────────────────────────
        print("── Step 6: GPS Tracking ──")
        on_the_way     = [b for b in all_bookings if b.booking_status == models.BookingStatus.on_the_way]
        company_lookup = {c.company_id: c for c in all_companies}
        all_tracking   = []

        for booking in on_the_way:
            tanker  = tanker_lookup[booking.tanker_id]
            company = company_lookup[booking.company_id]
            if company.latitude is None:
                continue
            lat, lng = company.latitude, company.longitude
            for j in range(10):
                lat = lat + random.uniform(-0.001, 0.001)
                lng = lng + random.uniform(-0.001, 0.001)
                record = models.Tracking(
                    tanker_id=tanker.tanker_id,
                    latitude=round(lat, 6),
                    longitude=round(lng, 6),
                    timestamp=datetime.utcnow() - timedelta(seconds=(10 - j) * 5),
                    speed_kmph=float(round(random.uniform(15, 60), 1)),
                    heading=float(round(random.uniform(0, 360), 1)),
                )
                db.add(record)
                all_tracking.append(record)
        
        tracking_count = len(all_tracking)
        db.commit()
        print(f"  OK  {tracking_count} GPS records  ({len(on_the_way)} active tankers x 10 points)\n")

        # ── Final Summary ─────────────────────────────────────────────────────
        print("=" * 52)
        print("  AquaConnect seed complete!")
        print("=" * 52)
        print(f"  {'Cities':<24}: {len(CITY_CONFIG)}")
        print(f"  {'Companies':<24}: {len(all_companies)}  (25/city)")
        print(f"  {'Tankers':<24}: {len(all_tankers)}  (12/company)")
        for cap in CAPACITY_PRICE_RANGE:
            n = sum(1 for t in all_tankers if t.capacity_liters == cap)
            print(f"    {'L' + str(cap):<22}: {n}")
        print(f"  {'Users':<24}: {len(all_users)}  (50/city)")
        print(f"  {'Bookings':<24}: {len(all_bookings)}  (40/city)")
        print(f"  {'Payments':<24}: {len(all_bookings)}")
        print(f"  {'GPS records':<24}: {tracking_count}")
        print("=" * 52)

    except Exception as e:
        db.rollback()
        print(f"\nSeed failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
