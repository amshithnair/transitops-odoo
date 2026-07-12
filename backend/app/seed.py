"""
TransitOps seed data — creates one user per role and example workflow entities.

Run on every startup (idempotent — skips if seed data already exists).
"""

from datetime import date
from sqlalchemy.orm import Session

from app.models import User, Vehicle, Driver, UserRole, VehicleStatus, DriverStatus
from app.security import hash_password


SEED_USERS = [
    {
        "name": "Alice Fleet",
        "email": "fleet@transitops.com",
        "password": "Fleet@123",
        "role": UserRole.fleet_manager,
    },
    {
        "name": "Bob Driver",
        "email": "driver@transitops.com",
        "password": "Driver@123",
        "role": UserRole.driver,
    },
    {
        "name": "Carol Safety",
        "email": "safety@transitops.com",
        "password": "Safety@123",
        "role": UserRole.safety_officer,
    },
    {
        "name": "Dave Finance",
        "email": "finance@transitops.com",
        "password": "Finance@123",
        "role": UserRole.financial_analyst,
    },
]

SEED_VEHICLES = [
    {
        "registration_number": "VAN-05",
        "name_model": "Ford Transit 2024",
        "type": "Van",
        "max_load_capacity_kg": 2500.0,
        "odometer_km": 15000.0,
        "acquisition_cost": 45000.0,
        "status": VehicleStatus.Available,
        "region": "North",
        "insurance_expiry": date(2027, 6, 1),
        "rc_expiry": date(2035, 1, 1),
        "puc_expiry": date(2026, 12, 1),
        "fitness_expiry": date(2028, 6, 1),
        "documents": [
            {"id": "doc_ins_1", "label": "Insurance", "filename": "insurance_van05.pdf", "dataUrl": "data:application/pdf;base64,JVBER...", "uploaded_at": "2026-07-01T10:00:00Z"},
            {"id": "doc_rc_1", "label": "RC", "filename": "rc_van05.pdf", "dataUrl": "data:application/pdf;base64,JVBER...", "uploaded_at": "2026-07-01T10:00:00Z"}
        ]
    },
    {
        "registration_number": "TRK-12",
        "name_model": "Volvo FH16",
        "type": "Truck",
        "max_load_capacity_kg": 18000.0,
        "odometer_km": 85000.0,
        "acquisition_cost": 120000.0,
        "status": VehicleStatus.Available,
        "region": "South",
        "insurance_expiry": date(2026, 8, 15),
        "rc_expiry": date(2030, 4, 1),
        "puc_expiry": date(2026, 7, 30), # expired soon
        "fitness_expiry": date(2027, 2, 28),
        "documents": [
            {"id": "doc_ins_2", "label": "Insurance", "filename": "insurance_trk12.pdf", "dataUrl": "data:application/pdf;base64,JVBER...", "uploaded_at": "2026-07-01T10:00:00Z"}
        ]
    },
    {
        "registration_number": "VAN-03",
        "name_model": "Mercedes Sprinter",
        "type": "Van",
        "max_load_capacity_kg": 2000.0,
        "odometer_km": 42000.0,
        "acquisition_cost": 38000.0,
        "status": VehicleStatus.Available,
        "region": "East",
        "insurance_expiry": date(2025, 12, 31), # already expired
        "rc_expiry": date(2029, 10, 1),
        "puc_expiry": date(2025, 10, 1), # already expired
        "fitness_expiry": date(2026, 12, 31),
        "documents": []
    },
]

SEED_DRIVERS = [
    {
        "name": "Alex Johnson",
        "license_number": "DL-2024-0042",
        "license_category": "C",
        "license_expiry_date": date(2027, 12, 31),
        "contact_number": "+1-555-0142",
        "safety_score": 95.0,
        "status": DriverStatus.Available,
    },
    {
        "name": "Maria Garcia",
        "license_number": "DL-2024-0078",
        "license_category": "C+E",
        "license_expiry_date": date(2027, 6, 15),
        "contact_number": "+1-555-0178",
        "safety_score": 98.0,
        "status": DriverStatus.Available,
    },
    {
        "name": "James Chen",
        "license_number": "DL-2023-0091",
        "license_category": "B",
        "license_expiry_date": date(2026, 3, 1),
        "contact_number": "+1-555-0191",
        "safety_score": 88.0,
        "status": DriverStatus.Off_Duty,
    },
]


def seed_database(db: Session) -> None:
    """
    Seed the database with demo data. Idempotent — checks for existing seed
    users before inserting.
    """
    # Check if already seeded
    existing = db.query(User).filter(User.email == "fleet@transitops.com").first()
    if existing:
        return  # Already seeded

    # Seed users
    for user_data in SEED_USERS:
        user = User(
            name=user_data["name"],
            email=user_data["email"],
            hashed_password=hash_password(user_data["password"]),
            role=user_data["role"],
        )
        db.add(user)

    # Seed vehicles
    for vehicle_data in SEED_VEHICLES:
        vehicle = Vehicle(**vehicle_data)
        db.add(vehicle)

    # Seed drivers
    for driver_data in SEED_DRIVERS:
        driver = Driver(**driver_data)
        db.add(driver)

    db.commit()
