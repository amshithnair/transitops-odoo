"""
Tests for Maintenance router.

Covers:
  - Happy path maintenance cycle (Open -> Close)
  - Rule 9: Creating maintenance changes vehicle status to 'In Shop'
  - Rule 10: Closing maintenance restores vehicle to 'Available'
  - Rule 10 Edge Case: Closing maintenance on 'Retired' vehicle keeps it 'Retired'
  - RBAC checks
"""

import pytest
from app.models import VehicleStatus, MaintenanceStatus


def test_maintenance_lifecycle_happy_path(client, manager_headers, seeded_vehicle, db_session):
    # 1. Create maintenance log
    payload = {
        "vehicle_id": seeded_vehicle.id,
        "service_type": "Tire Replacement",
        "description": "Replacing front steering tires",
        "cost": 800.0,
        "odometer_at_service_km": 50000.0,
    }
    response = client.post("/maintenance", json=payload, headers=manager_headers)
    assert response.status_code == 201
    log_data = response.json()
    assert log_data["status"] == "Open"
    log_id = log_data["id"]

    # Verify vehicle status is flipped to 'In Shop' (Rule 9)
    db_session.refresh(seeded_vehicle)
    assert seeded_vehicle.status == VehicleStatus.In_Shop

    # 2. Close maintenance log
    close_payload = {
        "cost": 850.0,  # Updated final cost
        "description": "Completed tire replacement and wheel alignment",
    }
    close_resp = client.post(f"/maintenance/{log_id}/close", json=close_payload, headers=manager_headers)
    assert close_resp.status_code == 200
    assert close_resp.json()["status"] == "Closed"
    assert close_resp.json()["cost"] == 850.0

    # Verify vehicle status is restored to 'Available' (Rule 10)
    db_session.refresh(seeded_vehicle)
    assert seeded_vehicle.status == VehicleStatus.Available


def test_maintenance_close_retired_vehicle_rule_10(client, manager_headers, seeded_vehicle, db_session):
    # Create maintenance
    payload = {
        "vehicle_id": seeded_vehicle.id,
        "service_type": "Diagnostic Check",
        "cost": 100.0,
    }
    log_id = client.post("/maintenance", json=payload, headers=manager_headers).json()["id"]

    # Retire vehicle while it is in the shop
    seeded_vehicle.status = VehicleStatus.Retired
    db_session.commit()

    # Close maintenance
    client.post(f"/maintenance/{log_id}/close", headers=manager_headers)

    # Verify vehicle status stays 'Retired' (Rule 10)
    db_session.refresh(seeded_vehicle)
    assert seeded_vehicle.status == VehicleStatus.Retired


def test_maintenance_close_already_closed_fails(client, manager_headers, seeded_vehicle):
    payload = {
        "vehicle_id": seeded_vehicle.id,
        "service_type": "Diagnostic Check",
    }
    log_id = client.post("/maintenance", json=payload, headers=manager_headers).json()["id"]
    client.post(f"/maintenance/{log_id}/close", headers=manager_headers)

    # Double closing fails
    response = client.post(f"/maintenance/{log_id}/close", headers=manager_headers)
    assert response.status_code == 409


def test_rbac_maintenance_rejection(client, driver_headers, seeded_vehicle):
    payload = {
        "vehicle_id": seeded_vehicle.id,
        "service_type": "Engine Repair",
    }
    response = client.post("/maintenance", json=payload, headers=driver_headers)
    assert response.status_code == 403
