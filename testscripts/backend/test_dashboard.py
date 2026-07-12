"""
Tests for Dashboard router.

Covers:
  - KPI counts (active/available/in maintenance/on trip status counts)
  - Driver & Trip KPI status aggregation
  - Optional Query Filtering (vehicle_type, status, region)
"""

import pytest
from app.models import VehicleStatus, DriverStatus, TripStatus


def test_dashboard_kpi_counts_happy_path(
    client, manager_headers, seeded_vehicle, seeded_driver, db_session
):
    # Retrieve dashboard KPIs
    response = client.get("/dashboard/kpis", headers=manager_headers)
    assert response.status_code == 200
    kpis = response.json()

    assert kpis["active_vehicles"] == 1
    assert kpis["available_vehicles"] == 1
    assert kpis["vehicles_in_maintenance"] == 0
    assert kpis["active_trips"] == 0
    assert kpis["pending_trips"] == 0
    assert kpis["drivers_on_duty"] == 0
    assert kpis["fleet_utilization_pct"] == 0.0


def test_dashboard_kpis_with_filters(
    client, manager_headers, seeded_vehicle, seeded_driver, db_session
):
    from app.models import Vehicle

    # Add another vehicle of a different type/region
    v2 = Vehicle(
        registration_number="VAN-88",
        name_model="Chevrolet Express",
        type="Van",
        max_load_capacity_kg=1800.0,
        status=VehicleStatus.In_Shop,
        region="East",
    )
    db_session.add(v2)
    db_session.commit()

    # Query with filter matching only the Truck (seeded_vehicle: type=Truck, region=West)
    resp_truck = client.get("/dashboard/kpis?vehicle_type=Truck", headers=manager_headers)
    assert resp_truck.status_code == 200
    kpis_truck = resp_truck.json()
    assert kpis_truck["active_vehicles"] == 1
    assert kpis_truck["available_vehicles"] == 1
    assert kpis_truck["vehicles_in_maintenance"] == 0

    # Query with filter matching only the Van (v2: type=Van, region=East)
    resp_van = client.get("/dashboard/kpis?vehicle_type=Van", headers=manager_headers)
    assert resp_van.status_code == 200
    kpis_van = resp_van.json()
    assert kpis_van["active_vehicles"] == 1
    assert kpis_van["available_vehicles"] == 0
    assert kpis_van["vehicles_in_maintenance"] == 1

    # Query without filters (matches both)
    resp_all = client.get("/dashboard/kpis", headers=manager_headers)
    kpis_all = resp_all.json()
    assert kpis_all["active_vehicles"] == 2
    assert kpis_all["available_vehicles"] == 1
    assert kpis_all["vehicles_in_maintenance"] == 1
