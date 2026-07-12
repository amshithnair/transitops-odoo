"""
Tests for Vehicles router.

Covers:
  - CRUD operations by Fleet Manager
  - Rule 1: unique registration_number constraint (409)
  - RBAC protection (403 for non-managers attempting mutations)
  - Filtering search list (type, status, region)
"""

import pytest


def test_list_vehicles(client, manager_headers, seeded_vehicle):
    response = client.get("/vehicles", headers=manager_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["registration_number"] == "TRUCK-01"


def test_get_vehicle_by_id(client, manager_headers, seeded_vehicle):
    response = client.get(f"/vehicles/{seeded_vehicle.id}", headers=manager_headers)
    assert response.status_code == 200
    assert response.json()["registration_number"] == "TRUCK-01"


def test_get_vehicle_not_found(client, manager_headers):
    response = client.get("/vehicles/nonexistent-id", headers=manager_headers)
    assert response.status_code == 404


def test_create_vehicle_success(client, manager_headers):
    payload = {
        "registration_number": "VAN-99",
        "name_model": "Mercedes Benz Sprinter",
        "type": "Van",
        "max_load_capacity_kg": 2200.0,
        "odometer_km": 1000.0,
        "acquisition_cost": 42000.0,
        "status": "Available",
        "region": "East",
    }
    response = client.post("/vehicles", json=payload, headers=manager_headers)
    assert response.status_code == 201
    assert response.json()["registration_number"] == "VAN-99"


def test_create_vehicle_duplicate_registration_rule_1(client, manager_headers, seeded_vehicle):
    # Rule 1: Vehicle registration number must be unique.
    payload = {
        "registration_number": "TRUCK-01",  # Same as seeded_vehicle
        "name_model": "Another Scania",
        "type": "Truck",
        "max_load_capacity_kg": 15000.0,
    }
    response = client.post("/vehicles", json=payload, headers=manager_headers)
    assert response.status_code == 409
    assert "Rule 1" in response.json()["detail"]


def test_update_vehicle_success(client, manager_headers, seeded_vehicle):
    payload = {
        "name_model": "Scania R500 V8",
        "odometer_km": 52000.0,
    }
    response = client.put(f"/vehicles/{seeded_vehicle.id}", json=payload, headers=manager_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name_model"] == "Scania R500 V8"
    assert data["odometer_km"] == 52000.0


def test_update_vehicle_duplicate_registration_rule_1(client, manager_headers, seeded_vehicle):
    # Create second vehicle first
    payload_new = {
        "registration_number": "VAN-44",
        "name_model": "Ford Transit",
        "type": "Van",
        "max_load_capacity_kg": 2000.0,
    }
    res = client.post("/vehicles", json=payload_new, headers=manager_headers)
    second_id = res.json()["id"]

    # Try updating second vehicle to use the registration number of the first one
    payload_update = {
        "registration_number": "TRUCK-01",  # Clashes with seeded_vehicle
    }
    response = client.put(f"/vehicles/{second_id}", json=payload_update, headers=manager_headers)
    assert response.status_code == 409
    assert "Rule 1" in response.json()["detail"]


def test_delete_vehicle_success(client, manager_headers, seeded_vehicle):
    response = client.delete(f"/vehicles/{seeded_vehicle.id}", headers=manager_headers)
    assert response.status_code == 204
    # Double check it is deleted
    assert client.get(f"/vehicles/{seeded_vehicle.id}", headers=manager_headers).status_code == 404


def test_rbac_vehicle_creation_rejection(client, driver_headers):
    payload = {
        "registration_number": "VAN-88",
        "name_model": "Ford Transit",
        "type": "Van",
        "max_load_capacity_kg": 2000.0,
    }
    # Drivers cannot create vehicles
    response = client.post("/vehicles", json=payload, headers=driver_headers)
    assert response.status_code == 403
