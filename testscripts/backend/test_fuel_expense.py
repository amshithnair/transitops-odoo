"""
Tests for Fuel & Expense router.

Covers:
  - Create and list fuel logs (Manager, Driver, Finance)
  - Create and list expenses (Manager, Finance)
  - RBAC write protections (e.g. Drivers cannot write expenses; Safety cannot write either)
  - Operational cost query endpoint validation
"""

import pytest


def test_fuel_log_creation_and_listing(client, manager_headers, seeded_vehicle):
    payload = {
        "vehicle_id": seeded_vehicle.id,
        "liters": 50.0,
        "cost": 85.50,
        "date": "2026-07-12",
        "odometer_km": 50100.0,
    }
    response = client.post("/fuel-expense/fuel", json=payload, headers=manager_headers)
    assert response.status_code == 201
    assert response.json()["liters"] == 50.0

    # List fuel logs
    list_resp = client.get(f"/fuel-expense/fuel?vehicle_id={seeded_vehicle.id}", headers=manager_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1


def test_expense_creation_and_listing(client, manager_headers, seeded_vehicle):
    payload = {
        "vehicle_id": seeded_vehicle.id,
        "category": "Toll",
        "amount": 25.00,
        "date": "2026-07-12",
        "notes": "State highway pass",
    }
    response = client.post("/fuel-expense/expenses", json=payload, headers=manager_headers)
    assert response.status_code == 201
    assert response.json()["category"] == "Toll"

    # List expenses
    list_resp = client.get(f"/fuel-expense/expenses?vehicle_id={seeded_vehicle.id}", headers=manager_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1


def test_operational_cost_calculation(client, manager_headers, seeded_vehicle):
    # 1. Create fuel log (Cost = 100.0)
    client.post("/fuel-expense/fuel", json={
        "vehicle_id": seeded_vehicle.id,
        "liters": 60.0,
        "cost": 100.0,
        "date": "2026-07-12",
    }, headers=manager_headers)

    # 2. Create expense (Amount = 40.0)
    client.post("/fuel-expense/expenses", json={
        "vehicle_id": seeded_vehicle.id,
        "category": "Parking",
        "amount": 40.0,
        "date": "2026-07-12",
    }, headers=manager_headers)

    # 3. Create maintenance log (Cost = 250.0)
    client.post("/maintenance", json={
        "vehicle_id": seeded_vehicle.id,
        "service_type": "Oil Change",
        "cost": 250.0,
    }, headers=manager_headers)

    # Calculate operational cost (100.0 fuel + 40.0 expense + 250.0 maintenance = 390.0)
    cost_resp = client.get(f"/fuel-expense/operational-cost/{seeded_vehicle.id}", headers=manager_headers)
    assert cost_resp.status_code == 200
    data = cost_resp.json()
    assert data["fuel_cost"] == 100.0
    assert data["expense_cost"] == 40.0
    assert data["maintenance_cost"] == 250.0
    assert data["total_cost"] == 390.0


def test_rbac_fuel_expense_mutations(client, driver_headers, safety_headers, seeded_vehicle):
    # Driver can submit fuel log -> Allowed
    fuel_payload = {
        "vehicle_id": seeded_vehicle.id,
        "liters": 40.0,
        "cost": 65.0,
        "date": "2026-07-12",
    }
    assert client.post("/fuel-expense/fuel", json=fuel_payload, headers=driver_headers).status_code == 201

    # Driver cannot submit expenses -> Rejected
    expense_payload = {
        "vehicle_id": seeded_vehicle.id,
        "category": "Fine",
        "amount": 100.00,
        "date": "2026-07-12",
    }
    assert client.post("/fuel-expense/expenses", json=expense_payload, headers=driver_headers).status_code == 403

    # Safety officer cannot submit fuel logs -> Rejected
    assert client.post("/fuel-expense/fuel", json=fuel_payload, headers=safety_headers).status_code == 403
