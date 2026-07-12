"""
Pytest fixtures for backend tests.

Uses an in-memory SQLite database to isolate tests.
Provides test client, database session, and auth headers for different roles.
"""

import os
import sys
from pathlib import Path

# Add backend to sys.path
backend_path = str(Path(__file__).parent.parent.parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

# Force SQLite for test session database to avoid psycopg2 loading
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import User, UserRole, Vehicle, Driver, VehicleStatus, DriverStatus
from app.security import hash_password, create_access_token


# ──────────────────────────── Database Setup ────────────────────────────

# Use memory SQLite for fast, isolated test runs
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="db_session")
def fixture_db_session():
    """Create a fresh in-memory database and session for each test."""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="client")
def fixture_client(db_session):
    """Create a test client with overridden database dependency."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


# ──────────────────────────── User Seed Fixtures ────────────────────────────

@pytest.fixture
def test_users(db_session):
    """Seed one user for each RBAC role."""
    roles = [
        ("Fleet Manager", "manager@transitops.com", UserRole.fleet_manager),
        ("Driver Bob", "driver@transitops.com", UserRole.driver),
        ("Safety Officer", "safety@transitops.com", UserRole.safety_officer),
        ("Finance Analyst", "finance@transitops.com", UserRole.financial_analyst),
    ]
    users = {}
    for name, email, role in roles:
        user = User(
            name=name,
            email=email,
            hashed_password=hash_password("password123"),
            role=role,
            is_active=True,
        )
        db_session.add(user)
        db_session.commit()
        db_session.refresh(user)
        users[role.value] = user
    return users


# ──────────────────────────── Auth Headers Fixtures ────────────────────────────

def _get_headers_for_role(user: User) -> dict:
    token = create_access_token(data={"sub": user.id, "role": user.role.value})
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def manager_headers(test_users):
    return _get_headers_for_role(test_users[UserRole.fleet_manager.value])


@pytest.fixture
def driver_headers(test_users):
    return _get_headers_for_role(test_users[UserRole.driver.value])


@pytest.fixture
def safety_headers(test_users):
    return _get_headers_for_role(test_users[UserRole.safety_officer.value])


@pytest.fixture
def finance_headers(test_users):
    return _get_headers_for_role(test_users[UserRole.financial_analyst.value])


# ──────────────────────────── Entity Seed Fixtures ────────────────────────────

@pytest.fixture
def seeded_vehicle(db_session):
    vehicle = Vehicle(
        registration_number="TRUCK-01",
        name_model="Scania R500",
        type="Truck",
        max_load_capacity_kg=15000.0,
        odometer_km=50000.0,
        acquisition_cost=95000.0,
        status=VehicleStatus.Available,
        region="West",
    )
    db_session.add(vehicle)
    db_session.commit()
    db_session.refresh(vehicle)
    return vehicle


@pytest.fixture
def seeded_driver(db_session):
    from datetime import date
    driver = Driver(
        name="Alex Driver",
        license_number="DL-778899",
        license_category="C+E",
        license_expiry_date=date(2028, 12, 31),
        contact_number="+1-555-0999",
        safety_score=97.0,
        status=DriverStatus.Available,
    )
    db_session.add(driver)
    db_session.commit()
    db_session.refresh(driver)
    return driver
