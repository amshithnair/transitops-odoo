"""
Dashboard router — KPI endpoint with optional filters.

KPIs:
  - Active Vehicles (not Retired)
  - Available Vehicles
  - Vehicles in Maintenance (In Shop)
  - Active Trips (Dispatched)
  - Pending Trips (Draft)
  - Drivers On Duty (On Trip)
  - Fleet Utilization % = vehicles On Trip / total active vehicles
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, Driver, Trip,
    VehicleStatus, DriverStatus, TripStatus,
)
from app.schemas import DashboardKPIs
from app.deps import get_current_user

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/kpis",
    response_model=DashboardKPIs,
    summary="Get dashboard KPIs",
    description="Returns fleet KPIs. Supports optional filters by vehicle type, "
                "status, and region (applied to vehicle-related KPIs).",
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

    active_vehicles = [v for v in all_vehicles if v.status != VehicleStatus.Retired]
    available_vehicles = [v for v in all_vehicles if v.status == VehicleStatus.Available]
    in_maintenance = [v for v in all_vehicles if v.status == VehicleStatus.In_Shop]
    on_trip_vehicles = [v for v in all_vehicles if v.status == VehicleStatus.On_Trip]

    # Trip counts (not filtered by vehicle filters — they're trip-level)
    active_trips = db.query(Trip).filter(Trip.status == TripStatus.Dispatched).count()
    pending_trips = db.query(Trip).filter(Trip.status == TripStatus.Draft).count()

    # Driver count
    drivers_on_duty = db.query(Driver).filter(
        Driver.status == DriverStatus.On_Trip
    ).count()

    # Fleet utilization
    total_active = len(active_vehicles)
    utilization = (
        (len(on_trip_vehicles) / total_active * 100) if total_active > 0 else 0.0
    )

    return DashboardKPIs(
        active_vehicles=len(active_vehicles),
        available_vehicles=len(available_vehicles),
        vehicles_in_maintenance=len(in_maintenance),
        active_trips=active_trips,
        pending_trips=pending_trips,
        drivers_on_duty=drivers_on_duty,
        fleet_utilization_pct=round(utilization, 1),
    )
