"""
Fleet Map router — returns vehicle locations for map visualization.

Returns all non-retired vehicles with their coordinates, status, and
current driver information (if assigned or on active trip).
"""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, Driver, Trip,
    VehicleStatus, TripStatus,
)
from app.schemas import MapVehicle
from app.deps import get_current_user

router = APIRouter(prefix="/map", tags=["Fleet Map"])


@router.get(
    "/vehicles",
    response_model=list[MapVehicle],
    summary="Get vehicle locations for map",
    description="Returns all non-retired vehicles with coordinates and driver info.",
    responses={401: {"description": "Not authenticated"}},
)
def get_map_vehicles(
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    vehicle_type: Optional[str] = Query(None, alias="type", description="Filter by type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.Retired)
    if status_filter:
        query = query.filter(Vehicle.status == status_filter)
    if vehicle_type:
        query = query.filter(Vehicle.type == vehicle_type)

    vehicles = query.all()
    results = []

    for v in vehicles:
        # Find current driver — either assigned driver or driver on active trip
        driver_name = None
        driver_id = None

        # Check assigned drivers
        if v.assigned_drivers:
            d = v.assigned_drivers[0]
            driver_name = d.name
            driver_id = d.id

        # Check active trips for this vehicle
        active_trip = db.query(Trip).filter(
            Trip.vehicle_id == v.id,
            Trip.status == TripStatus.Dispatched,
        ).first()
        if active_trip:
            trip_driver = db.query(Driver).filter(Driver.id == active_trip.driver_id).first()
            if trip_driver:
                driver_name = trip_driver.name
                driver_id = trip_driver.id

        results.append(MapVehicle(
            id=v.id,
            registration_number=v.registration_number,
            name_model=v.name_model,
            type=v.type,
            status=v.status,
            latitude=v.latitude,
            longitude=v.longitude,
            last_location_update=v.last_location_update,
            driver_name=driver_name,
            driver_id=driver_id,
        ))

    return results
