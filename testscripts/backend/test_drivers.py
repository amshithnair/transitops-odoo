"""
Tests for Drivers router.

Covers:
  - CRUD operations
  - Unique license_number constraint (409)
  - RBAC compliance updates:
    - fleet_manager can update any field.
    - safety_officer can ONLY update compliance fields (license_*, safety_score, status).
    - driver is rejected with 403 on write mutations.
"""

from datetime import date
import pytest


def test_list_drivers(client, manager_headers, seeded_driver):
    response = client.get("/drivers", headers=manager_headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["license_number"] == "DL-778899"


def test_create_driver_success(client, manager_headers):
    payload = {
        "name": "Jane Driver",
        "license_number": "DL-112233",
        "license_category": "B",
        "license_expiry_date": "2027-08-31",
        "contact_number": "+1-555-0888",
        "safety_score": 99.0,
        "status": "Available",
    }
    response = client.post("/drivers", json=payload, headers=manager_headers)
    assert response.status_code == 201
    assert response.json()["name"] == "Jane Driver"


def test_create_driver_duplicate_license(client, manager_headers, seeded_driver):
    payload = {
        "name": "Jane Duplicate",
        "license_number": "DL-778899",  # Same as seeded_driver
        "license_category": "B",
        "license_expiry_date": "2027-08-31",
    }
    response = client.post("/drivers", json=payload, headers=manager_headers)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"]


def test_update_driver_full_access_manager(client, manager_headers, seeded_driver):
    payload = {
        "name": "Alex Updated Name",
        "contact_number": "+1-555-1111",
    }
    response = client.put(f"/drivers/{seeded_driver.id}", json=payload, headers=manager_headers)
    assert response.status_code == 200
    assert response.json()["name"] == "Alex Updated Name"
    assert response.json()["contact_number"] == "+1-555-1111"


def test_update_driver_compliance_only_safety_officer(client, safety_headers, seeded_driver):
    # Safety officer tries updating safety_score (compliance field) -> Allowed
    payload = {
        "safety_score": 85.0,
        "status": "Suspended",
    }
    response = client.put(f"/drivers/{seeded_driver.id}", json=payload, headers=safety_headers)
    assert response.status_code == 200
    assert response.json()["safety_score"] == 85.0
    assert response.json()["status"] == "Suspended"


def test_update_driver_non_compliance_rejection_safety_officer(client, safety_headers, seeded_driver):
    # Safety officer tries updating name (non-compliance field) -> Rejected
    payload = {
        "name": "Forbidden Name Edit",
    }
    response = client.put(f"/drivers/{seeded_driver.id}", json=payload, headers=safety_headers)
    assert response.status_code == 403
    assert "Safety officers can only update compliance fields" in response.json()["detail"]


def test_rbac_driver_rejection(client, driver_headers, seeded_driver):
    payload = {
        "name": "Unauthorized Attempt",
    }
    response = client.put(f"/drivers/{seeded_driver.id}", json=payload, headers=driver_headers)
    assert response.status_code == 403
