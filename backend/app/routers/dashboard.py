"""
Dashboard router — KPI endpoint with optional filters and financial metrics.

KPIs:
  - Total Vehicles
  - Active Vehicles (not Retired)
  - Available Vehicles
  - Vehicles in Maintenance (In Shop)
  - Total Drivers
  - Available Drivers
  - Active Trips (Dispatched)
  - Pending Trips (Draft)
  - Drivers On Duty (On Trip)
  - Fleet Utilization % = vehicles On Trip / total active vehicles
  - Total Fuel Cost (all time)
  - Monthly Expense (current month fuel + expenses)
  - Average Mileage (km/liter from completed trips)
  - Vehicle Status Breakdown (live data for dashboard bars)
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, Driver, Trip, FuelLog, Expense,
    VehicleStatus, DriverStatus, TripStatus,
)
from app.schemas import DashboardKPIs, StatusBreakdown
from app.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

STATUS_COLORS = {
    "Available": "var(--green)",
    "On Trip": "var(--blue)",
    "In Shop": "var(--amber)",
    "Retired": "var(--red)",
}


@router.get(
    "/kpis",
    response_model=DashboardKPIs,
    summary="Get dashboard KPIs",
    description="Returns fleet KPIs including financial metrics. Supports optional filters "
                "by vehicle type, status, and region (applied to vehicle-related KPIs).",
    responses={401: {"description": "Not authenticated"}},
)
def get_kpis(
    vehicle_type: Optional[str] = Query(None, description="Filter by vehicle type"),
    vehicle_status: Optional[str] = Query(None, description="Filter by vehicle status"),
    region: Optional[str] = Query(None, description="Filter by region"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Base vehicle query with optional filters
    vq = db.query(Vehicle)
    if vehicle_type:
        vq = vq.filter(Vehicle.type == vehicle_type)
    if vehicle_status:
        vq = vq.filter(Vehicle.status == vehicle_status)
    if region:
        vq = vq.filter(Vehicle.region == region)

    all_vehicles = vq.all()

    total_vehicles = len(all_vehicles)
    active_vehicles = [v for v in all_vehicles if v.status != VehicleStatus.Retired]
    available_vehicles = [v for v in all_vehicles if v.status == VehicleStatus.Available]
    in_maintenance = [v for v in all_vehicles if v.status == VehicleStatus.In_Shop]
    on_trip_vehicles = [v for v in all_vehicles if v.status == VehicleStatus.On_Trip]

    # Vehicle status breakdown for charts
    status_counts = {}
    for v in all_vehicles:
        s = v.status.value
        status_counts[s] = status_counts.get(s, 0) + 1
    vehicle_status_breakdown = [
        StatusBreakdown(label=s, value=c, color=STATUS_COLORS.get(s, "var(--gray)"))
        for s, c in status_counts.items()
    ]

    # Trip counts (not filtered by vehicle filters — they're trip-level)
    active_trips = db.query(Trip).filter(Trip.status == TripStatus.Dispatched).count()
    pending_trips = db.query(Trip).filter(Trip.status == TripStatus.Draft).count()

    # Driver counts
    total_drivers = db.query(Driver).count()
    available_drivers = db.query(Driver).filter(
        Driver.status == DriverStatus.Available
    ).count()
    drivers_on_duty = db.query(Driver).filter(
        Driver.status == DriverStatus.On_Trip
    ).count()

    # Fleet utilization
    total_active = len(active_vehicles)
    utilization = (
        (len(on_trip_vehicles) / total_active * 100) if total_active > 0 else 0.0
    )

    # Financial KPIs
    total_fuel_cost = float(db.query(
        func.coalesce(func.sum(FuelLog.cost), 0.0)
    ).scalar())

    # Monthly expense = current month's fuel + expenses
    now = datetime.utcnow()
    monthly_fuel = float(db.query(
        func.coalesce(func.sum(FuelLog.cost), 0.0)
    ).filter(
        extract("year", FuelLog.date) == now.year,
        extract("month", FuelLog.date) == now.month,
    ).scalar())

    monthly_exp = float(db.query(
        func.coalesce(func.sum(Expense.amount), 0.0)
    ).filter(
        extract("year", Expense.date) == now.year,
        extract("month", Expense.date) == now.month,
    ).scalar())

    monthly_expense = monthly_fuel + monthly_exp

    # Average mileage from completed trips
    total_distance = float(db.query(
        func.coalesce(func.sum(Trip.actual_distance_km), 0.0)
    ).filter(Trip.status == TripStatus.Completed).scalar())

    total_fuel = float(db.query(
        func.coalesce(func.sum(FuelLog.liters), 0.0)
    ).scalar())

    average_mileage = round(total_distance / total_fuel, 1) if total_fuel > 0 else None

    return DashboardKPIs(
        total_vehicles=total_vehicles,
        active_vehicles=len(active_vehicles),
        available_vehicles=len(available_vehicles),
        vehicles_in_maintenance=len(in_maintenance),
        total_drivers=total_drivers,
        available_drivers=available_drivers,
        active_trips=active_trips,
        pending_trips=pending_trips,
        drivers_on_duty=drivers_on_duty,
        fleet_utilization_pct=round(utilization, 1),
        total_fuel_cost=total_fuel_cost,
        monthly_expense=monthly_expense,
        average_mileage=average_mileage,
        vehicle_status_breakdown=vehicle_status_breakdown,
    )
