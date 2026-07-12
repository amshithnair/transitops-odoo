"""
Trip router — lifecycle management with comprehensive business rule enforcement.

Lifecycle: Draft → Dispatched → Completed
                 → Cancelled (from Draft or Dispatched)

Business Rules enforced (with dual-point validation):
  Rule 2: Retired or In Shop vehicles cannot be dispatched / assigned.
          — Validated at BOTH create and dispatch.
  Rule 3: Drivers with expired license or Suspended status cannot be assigned.
          — Validated at BOTH create and dispatch.
  Rule 4: A driver or vehicle already On Trip cannot be assigned to another trip.
          — Validated at BOTH create and dispatch.
  Rule 5: Cargo weight must not exceed vehicle max_load_capacity_kg.
          — Validated at create.
  Rule 6: Dispatching sets vehicle + driver status to On Trip.
  Rule 7: Completing a trip sets vehicle + driver status back to Available.
  Rule 8: Cancelling a dispatched trip restores vehicle + driver to Available.

Design Decisions:
  #1: Trip completion auto-creates a FuelLog entry (FuelLog is canonical source).
  #2: Trip completion updates Vehicle.odometer_km.
  #3: Draft cancellation has no side effects; Dispatched cancellation restores statuses.

RBAC:
  fleet_manager — full trip management including dispatch
  driver        — create trips, view/update own assigned trips
  safety_officer, financial_analyst — read-only on trips
"""

from datetime import datetime, date

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, Driver, Trip, FuelLog, UserRole,
    VehicleStatus, DriverStatus, TripStatus,
)
from app.schemas import TripCreate, TripComplete, TripResponse
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/trips", tags=["Trips"])


def _validate_vehicle_driver_for_trip(
    vehicle: Vehicle,
    driver: Driver,
    cargo_weight_kg: float | None = None,
    context: str = "create",
):
    """
    Shared validation for trip creation and dispatch (dual-point validation).
    Enforces Rules 2, 3, 4, and optionally 5.
    """
    # Rule 2: Retired or In Shop vehicles must never appear in the dispatch pool.
    if vehicle.status in (VehicleStatus.Retired, VehicleStatus.In_Shop):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rule 2: Vehicle '{vehicle.registration_number}' is "
                   f"'{vehicle.status.value}' and cannot be assigned to a trip.",
        )

    # Rule 3: Drivers with expired license or Suspended status cannot be assigned.
    if driver.status == DriverStatus.Suspended:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rule 3: Driver '{driver.name}' is Suspended and cannot be "
                   f"assigned to a trip.",
        )
    if driver.license_expiry_date < date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rule 3: Driver '{driver.name}' has an expired license "
                   f"(expired {driver.license_expiry_date}) and cannot be assigned.",
        )

    # Rule 4: Vehicle or driver already On Trip cannot be assigned to another.
    if vehicle.status == VehicleStatus.On_Trip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rule 4: Vehicle '{vehicle.registration_number}' is already "
                   f"On Trip and cannot be assigned to another trip.",
        )
    if driver.status == DriverStatus.On_Trip:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rule 4: Driver '{driver.name}' is already On Trip and "
                   f"cannot be assigned to another trip.",
        )

    # Rule 5: Cargo weight must not exceed vehicle capacity (create only).
    if cargo_weight_kg is not None and cargo_weight_kg > vehicle.max_load_capacity_kg:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Rule 5: Cargo weight ({cargo_weight_kg} kg) exceeds "
                   f"vehicle capacity ({vehicle.max_load_capacity_kg} kg).",
        )


@router.get(
    "",
    response_model=list[TripResponse],
    summary="List trips",
    description="Returns all trips. Drivers only see their own assigned trips. "
                "Supports optional filters by status, vehicle_id, driver_id.",
    responses={401: {"description": "Not authenticated"}},
)
def list_trips(
    trip_status: TripStatus | None = Query(None, alias="status", description="Filter by trip status"),
    vehicle_id: str | None = Query(None, description="Filter by vehicle ID"),
    driver_id: str | None = Query(None, description="Filter by driver ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Trip)
    # Drivers only see trips assigned to them
    if current_user.role == UserRole.driver:
        query = query.filter(
            (Trip.created_by == current_user.id) |
            (Trip.driver_id.in_(
                db.query(Driver.id).filter(Driver.name == current_user.name)
            ))
        )
    if trip_status:
        query = query.filter(Trip.status == trip_status)
    if vehicle_id:
        query = query.filter(Trip.vehicle_id == vehicle_id)
    if driver_id:
        query = query.filter(Trip.driver_id == driver_id)
    return query.order_by(Trip.created_at.desc()).all()


@router.get(
    "/{trip_id}",
    response_model=TripResponse,
    summary="Get trip by ID",
    description="Returns a single trip.",
    responses={
        401: {"description": "Not authenticated"},
        404: {"description": "Trip not found"},
    },
)
def get_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    # Drivers can only see their own trips
    if current_user.role == UserRole.driver:
        if trip.created_by != current_user.id:
            driver_ids = [d.id for d in db.query(Driver.id).filter(Driver.name == current_user.name).all()]
            if trip.driver_id not in driver_ids:
                raise HTTPException(status_code=403, detail="Access denied — drivers can only view their own trips")
    return trip


@router.post(
    "",
    response_model=TripResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new trip (Draft)",
    description="Create a trip in Draft status. Validates Rules 2-5 at creation. "
                "Requires fleet_manager or driver role.",
    responses={
        400: {"description": "Business rule violation (Rules 2-5)"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Vehicle or driver not found"},
    },
)
def create_trip(
    payload: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.fleet_manager, UserRole.driver])
    ),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    driver = db.query(Driver).filter(Driver.id == payload.driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    # Dual-point validation — Rules 2, 3, 4, 5 at create
    _validate_vehicle_driver_for_trip(
        vehicle, driver, cargo_weight_kg=payload.cargo_weight_kg, context="create"
    )

    trip = Trip(
        source=payload.source,
        destination=payload.destination,
        vehicle_id=payload.vehicle_id,
        driver_id=payload.driver_id,
        cargo_weight_kg=payload.cargo_weight_kg,
        planned_distance_km=payload.planned_distance_km,
        revenue=payload.revenue,
        status=TripStatus.Dispatched if payload.dispatch else TripStatus.Draft,
        created_by=current_user.id,
    )
    if payload.dispatch:
        trip.dispatched_at = datetime.utcnow()
        vehicle.status = VehicleStatus.On_Trip
        driver.status = DriverStatus.On_Trip
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.post(
    "/{trip_id}/dispatch",
    response_model=TripResponse,
    summary="Dispatch a trip",
    description="Transition Draft → Dispatched. Re-validates Rules 2, 3, 4 "
                "(race-condition guard). Rule 6: sets vehicle + driver to On Trip.",
    responses={
        400: {"description": "Business rule violation (Rules 2-4)"},
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Trip not found"},
        409: {"description": "Trip not in Draft status"},
    },
)
def dispatch_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status != TripStatus.Draft:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot dispatch trip — current status is '{trip.status.value}', "
                   f"expected 'Draft'.",
        )

    vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
    driver = db.query(Driver).filter(Driver.id == trip.driver_id).first()

    # Dual-point validation — re-validate Rules 2, 3, 4 at dispatch
    _validate_vehicle_driver_for_trip(vehicle, driver, context="dispatch")

    # Rule 6: Dispatching sets vehicle + driver status to On Trip.
    vehicle.status = VehicleStatus.On_Trip
    driver.status = DriverStatus.On_Trip
    trip.status = TripStatus.Dispatched
    trip.dispatched_at = datetime.utcnow()

    db.commit()
    db.refresh(trip)
    return trip


@router.post(
    "/{trip_id}/complete",
    response_model=TripResponse,
    summary="Complete a trip",
    description="Transition Dispatched → Completed. Rule 7: restores vehicle + driver "
                "to Available. Design decision #1: auto-creates FuelLog. "
                "Design decision #2: updates Vehicle.odometer_km.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Trip not found"},
        409: {"description": "Trip not in Dispatched status"},
    },
)
def complete_trip(
    trip_id: str,
    payload: TripComplete,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.fleet_manager, UserRole.driver])
    ),
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")
    if trip.status != TripStatus.Dispatched:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot complete trip — current status is '{trip.status.value}', "
                   f"expected 'Dispatched'.",
        )

    vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
    driver = db.query(Driver).filter(Driver.id == trip.driver_id).first()

    # Update trip fields
    trip.actual_distance_km = payload.final_odometer - vehicle.odometer_km if payload.final_odometer > vehicle.odometer_km else 0
    trip.fuel_consumed_liters = payload.fuel_consumed
    trip.revenue = payload.revenue
    trip.status = TripStatus.Completed
    trip.completed_at = datetime.utcnow()

    # Rule 7: Completing sets vehicle + driver status back to Available.
    vehicle.status = VehicleStatus.Available
    driver.status = DriverStatus.Available

    # Design decision #2: Update Vehicle.odometer_km.
    vehicle.odometer_km = payload.final_odometer

    # Design decision #1: Auto-create FuelLog entry (canonical fuel data source).
    fuel_log = FuelLog(
        vehicle_id=trip.vehicle_id,
        trip_id=trip.id,
        liters=payload.fuel_consumed,
        cost=0.0,  # Cost is unknown at trip completion; can be updated later
        date=datetime.utcnow().date(),
        odometer_km=vehicle.odometer_km,
    )
    db.add(fuel_log)

    db.commit()
    db.refresh(trip)
    return trip


@router.post(
    "/{trip_id}/cancel",
    response_model=TripResponse,
    summary="Cancel a trip",
    description="Cancel a Draft or Dispatched trip. Design decision #3: "
                "Draft cancellation has no side effects. Dispatched cancellation "
                "restores vehicle + driver to Available (Rule 8). "
                "Completed/Cancelled trips cannot be cancelled (409).",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Trip not found"},
        409: {"description": "Trip cannot be cancelled from current status"},
    },
)
def cancel_trip(
    trip_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    trip = db.query(Trip).filter(Trip.id == trip_id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found")

    if trip.status in (TripStatus.Completed, TripStatus.Cancelled):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel trip — current status is '{trip.status.value}'. "
                   f"Only Draft or Dispatched trips can be cancelled.",
        )

    # Rule 8: Cancelling a dispatched trip restores vehicle + driver to Available.
    if trip.status == TripStatus.Dispatched:
        vehicle = db.query(Vehicle).filter(Vehicle.id == trip.vehicle_id).first()
        driver = db.query(Driver).filter(Driver.id == trip.driver_id).first()
        if vehicle:
            vehicle.status = VehicleStatus.Available
        if driver:
            driver.status = DriverStatus.Available

    # Design decision #3: Draft cancellation — just flip status, no side effects.
    trip.status = TripStatus.Cancelled
    trip.cancelled_at = datetime.utcnow()

    db.commit()
    db.refresh(trip)
    return trip
