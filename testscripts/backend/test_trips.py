"""
Tests for Trips router.

Covers:
  - Happy path trip lifecycle (Draft -> Dispatched -> Completed)
  - Business Rules 2-8 (Dual-point validation, status updates, cancellations)
  - Design decision #1: FuelLog auto-creation on completion
  - Design decision #2: Vehicle odometer update (relative and absolute)
  - Design decision #3: Draft trip cancellation (no side effects) vs Dispatched
  - RBAC checks
"""

from datetime import date, timedelta
import pytest
from app.models import VehicleStatus, DriverStatus, TripStatus


@pytest.fixture
def fresh_vehicle(db_session):
    from app.models import Vehicle
    v = Vehicle(
        registration_number="VAN-77",
        name_model="Ford Transit",
        type="Van",
        max_load_capacity_kg=2000.0,
        odometer_km=10000.0,
        acquisition_cost=30000.0,
        status=VehicleStatus.Available,
    )
    db_session.add(v)
    db_session.commit()
    db_session.refresh(v)
    return v


@pytest.fixture
def fresh_driver(db_session):
    from app.models import Driver
    d = Driver(
        name="John Doe",
        license_number="DL-111111",
        license_category="B",
        license_expiry_date=date.today() + timedelta(days=365),
        safety_score=100.0,
        status=DriverStatus.Available,
    )
    db_session.add(d)
    db_session.commit()
    db_session.refresh(d)
    return d


# ──────────────────────────── Lifecycle Tests ────────────────────────────

def test_trip_lifecycle_happy_path(client, manager_headers, fresh_vehicle, fresh_driver, db_session):
    from app.models import FuelLog

    # 1. Create trip (Draft)
    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1500.0,
        "planned_distance_km": 100.0,
        "revenue": 500.0,
    }
    response = client.post("/trips", json=payload, headers=manager_headers)
    assert response.status_code == 201
    trip_data = response.json()
    assert trip_data["status"] == "Draft"
    trip_id = trip_data["id"]

    # Verify vehicle and driver status remain Available
    db_session.refresh(fresh_vehicle)
    db_session.refresh(fresh_driver)
    assert fresh_vehicle.status == VehicleStatus.Available
    assert fresh_driver.status == DriverStatus.Available

    # 2. Dispatch trip
    dispatch_resp = client.post(f"/trips/{trip_id}/dispatch", headers=manager_headers)
    assert dispatch_resp.status_code == 200
    assert dispatch_resp.json()["status"] == "Dispatched"

    # Verify vehicle and driver status set to On Trip (Rule 6)
    db_session.refresh(fresh_vehicle)
    db_session.refresh(fresh_driver)
    assert fresh_vehicle.status == VehicleStatus.On_Trip
    assert fresh_driver.status == DriverStatus.On_Trip

    # 3. Complete trip (increment odometer relative to actual_distance_km)
    complete_payload = {
        "actual_distance_km": 95.0,
        "fuel_consumed_liters": 12.0,
    }
    complete_resp = client.post(f"/trips/{trip_id}/complete", json=complete_payload, headers=manager_headers)
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "Completed"

    # Verify statuses set back to Available (Rule 7)
    db_session.refresh(fresh_vehicle)
    db_session.refresh(fresh_driver)
    assert fresh_vehicle.status == VehicleStatus.Available
    assert fresh_driver.status == DriverStatus.Available

    # Verify odometer incremented (relative: 10000 + 95)
    assert fresh_vehicle.odometer_km == 10095.0

    # Verify FuelLog row is auto-created (Design decision #1)
    logs = db_session.query(FuelLog).filter(FuelLog.trip_id == trip_id).all()
    assert len(logs) == 1
    assert logs[0].liters == 12.0
    assert logs[0].odometer_km == 10095.0


def test_trip_completion_with_final_odometer(client, manager_headers, fresh_vehicle, fresh_driver, db_session):
    # Create and dispatch a trip
    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1000.0,
        "planned_distance_km": 100.0,
        "revenue": 500.0,
    }
    trip_id = client.post("/trips", json=payload, headers=manager_headers).json()["id"]
    client.post(f"/trips/{trip_id}/dispatch", headers=manager_headers)

    # Complete specifying final odometer absolute value
    complete_payload = {
        "actual_distance_km": 95.0,
        "fuel_consumed_liters": 12.0,
        "final_odometer_km": 10110.0,  # Absolute override
    }
    response = client.post(f"/trips/{trip_id}/complete", json=complete_payload, headers=manager_headers)
    assert response.status_code == 200
    db_session.refresh(fresh_vehicle)
    assert fresh_vehicle.odometer_km == 10110.0


# ──────────────────────────── Cancellation Tests ────────────────────────────

def test_cancel_draft_trip_no_side_effects(client, manager_headers, fresh_vehicle, fresh_driver, db_session):
    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1000.0,
        "planned_distance_km": 100.0,
    }
    trip_id = client.post("/trips", json=payload, headers=manager_headers).json()["id"]

    # Cancel Draft trip
    cancel_resp = client.post(f"/trips/{trip_id}/cancel", headers=manager_headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "Cancelled"

    db_session.refresh(fresh_vehicle)
    db_session.refresh(fresh_driver)
    assert fresh_vehicle.status == VehicleStatus.Available
    assert fresh_driver.status == DriverStatus.Available


def test_cancel_dispatched_trip_restores_available(client, manager_headers, fresh_vehicle, fresh_driver, db_session):
    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1000.0,
        "planned_distance_km": 100.0,
    }
    trip_id = client.post("/trips", json=payload, headers=manager_headers).json()["id"]
    client.post(f"/trips/{trip_id}/dispatch", headers=manager_headers)

    # Cancel Dispatched trip (Rule 8)
    cancel_resp = client.post(f"/trips/{trip_id}/cancel", headers=manager_headers)
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "Cancelled"

    db_session.refresh(fresh_vehicle)
    db_session.refresh(fresh_driver)
    assert fresh_vehicle.status == VehicleStatus.Available
    assert fresh_driver.status == DriverStatus.Available


def test_cancel_completed_trip_fails(client, manager_headers, fresh_vehicle, fresh_driver):
    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1000.0,
        "planned_distance_km": 100.0,
    }
    trip_id = client.post("/trips", json=payload, headers=manager_headers).json()["id"]
    client.post(f"/trips/{trip_id}/dispatch", headers=manager_headers)
    client.post(f"/trips/{trip_id}/complete", json={"actual_distance_km": 90, "fuel_consumed_liters": 10}, headers=manager_headers)

    # Cannot cancel completed trip
    cancel_resp = client.post(f"/trips/{trip_id}/cancel", headers=manager_headers)
    assert cancel_resp.status_code == 409


# ──────────────────────────── Business Rule Validation Tests ────────────────────────────

def test_rule_2_retired_or_in_shop_vehicle_rejection(client, manager_headers, fresh_vehicle, fresh_driver, db_session):
    # Set vehicle to In Shop
    fresh_vehicle.status = VehicleStatus.In_Shop
    db_session.commit()

    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1000.0,
        "planned_distance_km": 100.0,
    }
    response = client.post("/trips", json=payload, headers=manager_headers)
    assert response.status_code == 400
    assert "Rule 2" in response.json()["detail"]


def test_rule_3_driver_suspended_rejection(client, manager_headers, fresh_vehicle, fresh_driver, db_session):
    # Set driver to Suspended
    fresh_driver.status = DriverStatus.Suspended
    db_session.commit()

    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1000.0,
        "planned_distance_km": 100.0,
    }
    response = client.post("/trips", json=payload, headers=manager_headers)
    assert response.status_code == 400
    assert "Rule 3" in response.json()["detail"]


def test_rule_3_driver_expired_license_rejection(client, manager_headers, fresh_vehicle, fresh_driver, db_session):
    # Set driver license expiry to yesterday
    fresh_driver.license_expiry_date = date.today() - timedelta(days=1)
    db_session.commit()

    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1000.0,
        "planned_distance_km": 100.0,
    }
    response = client.post("/trips", json=payload, headers=manager_headers)
    assert response.status_code == 400
    assert "Rule 3" in response.json()["detail"]


def test_rule_4_vehicle_already_on_trip_rejection(client, manager_headers, fresh_vehicle, fresh_driver, db_session):
    # Set vehicle to On Trip
    fresh_vehicle.status = VehicleStatus.On_Trip
    db_session.commit()

    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1000.0,
        "planned_distance_km": 100.0,
    }
    response = client.post("/trips", json=payload, headers=manager_headers)
    assert response.status_code == 400
    assert "Rule 4" in response.json()["detail"]


def test_rule_5_cargo_weight_exceeds_capacity_rejection(client, manager_headers, fresh_vehicle, fresh_driver):
    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 2500.0,  # Exceeds max_load_capacity_kg (2000.0)
        "planned_distance_km": 100.0,
    }
    response = client.post("/trips", json=payload, headers=manager_headers)
    assert response.status_code == 400
    assert "Rule 5" in response.json()["detail"]


def test_dual_point_validation_on_dispatch(client, manager_headers, fresh_vehicle, fresh_driver, db_session):
    # Create trip first when both vehicle and driver are Available
    payload = {
        "source": "Warehouse A",
        "destination": "Depot B",
        "vehicle_id": fresh_vehicle.id,
        "driver_id": fresh_driver.id,
        "cargo_weight_kg": 1000.0,
        "planned_distance_km": 100.0,
    }
    trip_id = client.post("/trips", json=payload, headers=manager_headers).json()["id"]

    # Now make the vehicle In Shop before dispatching (e.g., maintenance record created)
    fresh_vehicle.status = VehicleStatus.In_Shop
    db_session.commit()

    # Try dispatching -> should trigger Rule 2 check on dispatch
    response = client.post(f"/trips/{trip_id}/dispatch", headers=manager_headers)
    assert response.status_code == 400
    assert "Rule 2" in response.json()["detail"]
