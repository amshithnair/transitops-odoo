"""
TransitOps seed data — creates one user per role and example workflow entities.

Run on every startup (idempotent — skips if seed data already exists).
"""

from datetime import date, datetime
from sqlalchemy.orm import Session

from app.models import User, Vehicle, Driver, FuelLog, Expense, UserRole, VehicleStatus, DriverStatus, ExpenseCategory
from app.security import hash_password


SEED_USERS = [
    {
        "name": "Alice Fleet",
        "email": "fleet@transitops.com",
        "password": "fleet123",
        "role": UserRole.fleet_manager,
    },
    {
        "name": "Bob Driver",
        "email": "driver@transitops.com",
        "password": "driver123",
        "role": UserRole.driver,
    },
    {
        "name": "Carol Safety",
        "email": "safety@transitops.com",
        "password": "safety123",
        "role": UserRole.safety_officer,
    },
    {
        "name": "Dave Finance",
        "email": "finance@transitops.com",
        "password": "finance123",
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
        "manufacturer": "Ford",
        "fuel_type": "Diesel",
        "purchase_date": date(2024, 1, 15),
        "insurance_expiry": date(2027, 1, 15),
        "fitness_expiry": date(2027, 6, 30),
        "puc_expiry": date(2026, 12, 31),
        "latitude": 23.0225,
        "longitude": 72.5714,
        "last_location_update": datetime(2026, 7, 12, 10, 30),
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
        "manufacturer": "Volvo",
        "fuel_type": "Diesel",
        "purchase_date": date(2023, 6, 1),
        "insurance_expiry": date(2026, 12, 1),
        "fitness_expiry": date(2027, 3, 15),
        "puc_expiry": date(2027, 6, 1),
        "latitude": 21.1702,
        "longitude": 72.8311,
        "last_location_update": datetime(2026, 7, 12, 9, 15),
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
        "manufacturer": "Mercedes-Benz",
        "fuel_type": "Diesel",
        "purchase_date": date(2023, 9, 20),
        "insurance_expiry": date(2026, 9, 20),
        "fitness_expiry": date(2027, 1, 10),
        "puc_expiry": date(2026, 11, 15),
        "latitude": 22.3072,
        "longitude": 73.1812,
        "last_location_update": datetime(2026, 7, 12, 11, 0),
    },
    {
        "registration_number": "MINI-07",
        "name_model": "Tata Ace Gold",
        "type": "Mini",
        "max_load_capacity_kg": 750.0,
        "odometer_km": 28000.0,
        "acquisition_cost": 18000.0,
        "status": VehicleStatus.In_Shop,
        "region": "West",
        "manufacturer": "Tata",
        "fuel_type": "Petrol",
        "purchase_date": date(2024, 3, 10),
        "insurance_expiry": date(2027, 3, 10),
        "fitness_expiry": date(2027, 9, 1),
        "puc_expiry": date(2027, 3, 10),
        "latitude": 23.2599,
        "longitude": 77.4126,
        "last_location_update": datetime(2026, 7, 11, 16, 45),
    },
    {
        "registration_number": "TRK-08",
        "name_model": "Ashok Leyland Dost",
        "type": "Truck",
        "max_load_capacity_kg": 3000.0,
        "odometer_km": 98500.0,
        "acquisition_cost": 55000.0,
        "status": VehicleStatus.Available,
        "region": "West",
        "manufacturer": "Ashok Leyland",
        "fuel_type": "Diesel",
        "purchase_date": date(2022, 11, 5),
        "insurance_expiry": date(2026, 11, 5),
        "fitness_expiry": date(2026, 8, 20),
        "puc_expiry": date(2026, 9, 1),
        "latitude": 19.0760,
        "longitude": 72.8777,
        "last_location_update": datetime(2026, 7, 12, 8, 0),
    },
    {
        "registration_number": "VAN-11",
        "name_model": "Mahindra Supro",
        "type": "Van",
        "max_load_capacity_kg": 1000.0,
        "odometer_km": 5200.0,
        "acquisition_cost": 22000.0,
        "status": VehicleStatus.Available,
        "region": "North",
        "manufacturer": "Mahindra",
        "fuel_type": "CNG",
        "purchase_date": date(2025, 6, 1),
        "insurance_expiry": date(2028, 6, 1),
        "fitness_expiry": date(2028, 6, 1),
        "puc_expiry": date(2027, 12, 1),
        "latitude": 28.7041,
        "longitude": 77.1025,
        "last_location_update": datetime(2026, 7, 12, 7, 30),
    },
]

SEED_DRIVERS = [
    {
        "name": "Alex Johnson",
        "license_number": "DL-2024-0042",
        "license_category": "C",
        "license_expiry_date": date(2027, 12, 31),
        "contact_number": "+1-555-0142",
        "email": "alex.johnson@transitops.com",
        "experience_years": 8,
        "safety_score": 95.0,
        "status": DriverStatus.Available,
    },
    {
        "name": "Maria Garcia",
        "license_number": "DL-2024-0078",
        "license_category": "C+E",
        "license_expiry_date": date(2027, 6, 15),
        "contact_number": "+1-555-0178",
        "email": "maria.garcia@transitops.com",
        "experience_years": 12,
        "safety_score": 98.0,
        "status": DriverStatus.Available,
    },
    {
        "name": "James Chen",
        "license_number": "DL-2023-0091",
        "license_category": "B",
        "license_expiry_date": date(2026, 3, 1),
        "contact_number": "+1-555-0191",
        "email": "james.chen@transitops.com",
        "experience_years": 3,
        "safety_score": 88.0,
        "status": DriverStatus.Off_Duty,
    },
    {
        "name": "Priya Sharma",
        "license_number": "DL-2024-0103",
        "license_category": "C",
        "license_expiry_date": date(2028, 2, 28),
        "contact_number": "+91-9980-100042",
        "email": "priya.sharma@transitops.com",
        "experience_years": 6,
        "safety_score": 92.0,
        "status": DriverStatus.Available,
    },
]

SEED_FUEL_LOGS = [
    {"liters": 45.0, "cost": 3375.0, "date": date(2026, 7, 1), "odometer_km": 14800.0},
    {"liters": 120.0, "cost": 9600.0, "date": date(2026, 7, 3), "odometer_km": 84500.0},
    {"liters": 38.0, "cost": 2850.0, "date": date(2026, 6, 28), "odometer_km": 41800.0},
    {"liters": 50.0, "cost": 3750.0, "date": date(2026, 6, 15), "odometer_km": 14200.0},
    {"liters": 25.0, "cost": 2000.0, "date": date(2026, 7, 5), "odometer_km": 27500.0},
]

SEED_EXPENSES = [
    {"category": ExpenseCategory.Toll, "amount": 350.0, "date": date(2026, 7, 2), "description": "Highway toll NH-48", "notes": "Round trip"},
    {"category": ExpenseCategory.Parking, "amount": 200.0, "date": date(2026, 7, 4), "description": "Warehouse parking fee"},
    {"category": ExpenseCategory.Fine, "amount": 500.0, "date": date(2026, 6, 20), "description": "Speed limit violation"},
    {"category": ExpenseCategory.Other, "amount": 1200.0, "date": date(2026, 7, 6), "description": "Tyre replacement emergency"},
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
    vehicle_objs = []
    for vehicle_data in SEED_VEHICLES:
        vehicle = Vehicle(**vehicle_data)
        db.add(vehicle)
        vehicle_objs.append(vehicle)

    # Seed drivers
    driver_objs = []
    for driver_data in SEED_DRIVERS:
        driver = Driver(**driver_data)
        db.add(driver)
        driver_objs.append(driver)

    db.flush()  # Get IDs assigned

    # Seed fuel logs (linked to first few vehicles)
    for i, fl_data in enumerate(SEED_FUEL_LOGS):
        vehicle = vehicle_objs[i % len(vehicle_objs)]
        fl = FuelLog(
            vehicle_id=vehicle.id,
            **fl_data,
        )
        db.add(fl)

    # Seed expenses (linked to first few vehicles)
    for i, exp_data in enumerate(SEED_EXPENSES):
        vehicle = vehicle_objs[i % len(vehicle_objs)]
        exp = Expense(
            vehicle_id=vehicle.id,
            **exp_data,
        )
        db.add(exp)

    db.commit()
