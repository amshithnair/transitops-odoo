"""
Vehicle router — full CRUD with business rule enforcement.

Business Rules enforced:
  Rule 1: Vehicle registration number must be unique (409 on duplicate).

RBAC:
  fleet_manager — full CRUD
  all others    — read-only
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Vehicle, UserRole
from app.schemas import VehicleCreate, VehicleUpdate, VehicleResponse
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/vehicles", tags=["Vehicles"])


@router.get(
    "",
    response_model=list[VehicleResponse],
    summary="List all vehicles",
    description="Returns all vehicles. Supports optional filters by type, status, and region.",
    responses={401: {"description": "Not authenticated"}},
)
def list_vehicles(
    type: Optional[str] = Query(None, description="Filter by vehicle type"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by vehicle status"),
    region: Optional[str] = Query(None, description="Filter by region"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Vehicle)
    if type:
        query = query.filter(Vehicle.type == type)
    if status_filter:
        query = query.filter(Vehicle.status == status_filter)
    if region:
        query = query.filter(Vehicle.region == region)
    return query.order_by(Vehicle.created_at.desc()).all()


@router.get(
    "/{vehicle_id}",
    response_model=VehicleResponse,
    summary="Get vehicle by ID",
    description="Returns a single vehicle by its UUID.",
    responses={
        401: {"description": "Not authenticated"},
        404: {"description": "Vehicle not found"},
    },
)
def get_vehicle(
    vehicle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle


@router.post(
    "",
    response_model=VehicleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new vehicle",
    description="Register a new vehicle. Requires fleet_manager role. "
                "Rule 1: registration_number must be unique.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        409: {"description": "Registration number already exists (Rule 1)"},
    },
)
def create_vehicle(
    payload: VehicleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    # Rule 1: Vehicle registration number must be unique.
    existing = db.query(Vehicle).filter(
        Vehicle.registration_number == payload.registration_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Rule 1: Vehicle registration number must be unique. "
                   f"'{payload.registration_number}' is already registered.",
        )
    vehicle = Vehicle(**payload.model_dump())
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.put(
    "/{vehicle_id}",
    response_model=VehicleResponse,
    summary="Update a vehicle",
    description="Update vehicle fields. Requires fleet_manager role. "
                "Rule 1: registration_number uniqueness is re-checked.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Vehicle not found"},
        409: {"description": "Registration number already exists (Rule 1)"},
    },
)
def update_vehicle(
    vehicle_id: str,
    payload: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    update_data = payload.model_dump(exclude_unset=True)

    # Rule 1: Check uniqueness if registration_number is being changed
    if "registration_number" in update_data:
        existing = db.query(Vehicle).filter(
            Vehicle.registration_number == update_data["registration_number"],
            Vehicle.id != vehicle_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Rule 1: Vehicle registration number must be unique. "
                       f"'{update_data['registration_number']}' is already registered.",
            )

    for field, value in update_data.items():
        setattr(vehicle, field, value)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.delete(
    "/{vehicle_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a vehicle",
    description="Delete a vehicle by ID. Requires fleet_manager role.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Vehicle not found"},
    },
)
def delete_vehicle(
    vehicle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    db.delete(vehicle)
    db.commit()
