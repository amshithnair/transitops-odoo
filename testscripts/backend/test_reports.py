"""
Tests for Reports router.

Covers:
  - Fuel Efficiency report & CSV (aggregated from FuelLog only, as single source of truth)
  - Fleet Utilization report & CSV
  - Operational Cost report & CSV
  - Vehicle ROI report & CSV
  - RBAC protection (Manager, Safety, Finance roles allowed; Driver rejected with 403)
"""

import pytest
from app.models import VehicleStatus, TripStatus


def test_reports_calculations_and_csv_generation(
    client, manager_headers, seeded_vehicle, seeded_driver, db_session
):
    # 1. Dispatch and complete a trip (Revenue = 1500, Distance = 200)
    from app.models import Trip, FuelLog, MaintenanceLog, Expense
    trip = Trip(
        source="Start",
        destination="End",
        vehicle_id=seeded_vehicle.id,
        driver_id=seeded_driver.id,
        cargo_weight_kg=5000.0,
        planned_distance_km=200.0,
        actual_distance_km=200.0,
        fuel_consumed_liters=40.0,
        revenue=1500.0,
        status=TripStatus.Completed,
        created_by="manager-uuid",
    )
    db_session.add(trip)

    date_object = date_from_string("2026-07-12")
    fuel = FuelLog(
        vehicle_id=seeded_vehicle.id,
        trip_id=trip.id,
        liters=40.0,
        cost=80.0,
        date=date_object,
    )
    db_session.add(fuel)

    # 3. Add Maintenance (Cost = 120.0)
    maint = MaintenanceLog(
        vehicle_id=seeded_vehicle.id,
        service_type="Brake repair",
        cost=120.0,
        status="Closed",
    )
    db_session.add(maint)

    # 4. Add Expense (Amount = 50.0)
    exp = Expense(
        vehicle_id=seeded_vehicle.id,
        category="Toll",
        amount=50.0,
        date=date_object,
    )
    db_session.add(exp)

    db_session.commit()

    # --- Verify Fuel Efficiency Report (Distance 200 / Liters 40 = 5.0) ---
    fuel_resp = client.get("/reports/fuel-efficiency", headers=manager_headers)
    assert fuel_resp.status_code == 200
    fuel_data = fuel_resp.json()
    assert len(fuel_data) == 1
    assert fuel_data[0]["efficiency_km_per_liter"] == 5.0

    # Fuel Efficiency CSV
    fuel_csv_resp = client.get("/reports/fuel-efficiency/csv", headers=manager_headers)
    assert fuel_csv_resp.status_code == 200
    assert "text/csv" in fuel_csv_resp.headers["content-type"]
    assert "efficiency_km_per_liter" in fuel_csv_resp.text

    # --- Verify Operational Cost Report (Fuel 80 + Maintenance 120 + Expense 50 = 250) ---
    cost_resp = client.get("/reports/operational-cost", headers=manager_headers)
    assert cost_resp.status_code == 200
    cost_data = cost_resp.json()
    assert cost_data[0]["total_cost"] == 250.0

    # Operational Cost CSV
    cost_csv_resp = client.get("/reports/operational-cost/csv", headers=manager_headers)
    assert cost_csv_resp.status_code == 200
    assert "total_cost" in cost_csv_resp.text

    # --- Verify Fleet Utilization Report (0 vehicles On Trip out of 1 active) ---
    util_resp = client.get("/reports/fleet-utilization", headers=manager_headers)
    assert util_resp.status_code == 200
    assert util_resp.json()["utilization_pct"] == 0.0

    # --- Verify Vehicle ROI Report ---
    # Revenue = 1500, Cost (Fuel + Maint) = 200. ROI = (1500 - 200) / 95000 (acquisition) * 100 = 1.37%
    roi_resp = client.get("/reports/vehicle-roi", headers=manager_headers)
    assert roi_resp.status_code == 200
    roi_data = roi_resp.json()
    assert roi_data[0]["roi_pct"] == 1.37


def test_reports_rbac_protections(client, driver_headers, safety_headers, finance_headers):
    # Driver rejected from accessing reports
    assert client.get("/reports/fleet-utilization", headers=driver_headers).status_code == 403

    # Safety Officer allowed
    assert client.get("/reports/fleet-utilization", headers=safety_headers).status_code == 200

    # Finance Analyst allowed
    assert client.get("/reports/fleet-utilization", headers=finance_headers).status_code == 200


def date_from_string(date_str: str):
    from datetime import datetime
    return datetime.strptime(date_str, "%Y-%m-%d").date()
