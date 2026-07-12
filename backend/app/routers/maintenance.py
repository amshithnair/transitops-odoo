"""
Maintenance router — create and close maintenance records.

Business Rules enforced:
  Rule 9:  Creating an active maintenance record sets vehicle status to In Shop.
  Rule 10: Closing maintenance restores vehicle to Available unless Retired.

RBAC:
  fleet_manager — full CRUD
  all others    — read-only
"""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, MaintenanceLog, UserRole,
    VehicleStatus, MaintenanceStatus,
)
from app.schemas import MaintenanceCreate, MaintenanceClose, MaintenanceResponse
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.get(
    "",
    response_model=list[MaintenanceResponse],
    summary="List maintenance logs",
    description="Returns all maintenance logs.",
    responses={401: {"description": "Not authenticated"}},
)
def list_maintenance(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(MaintenanceLog).order_by(MaintenanceLog.opened_at.desc()).all()


@router.get(
    "/{log_id}",
    response_model=MaintenanceResponse,
    summary="Get maintenance log by ID",
    responses={
        401: {"description": "Not authenticated"},
        404: {"description": "Maintenance log not found"},
    },
)
def get_maintenance(
    log_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
    return log


@router.post(
    "",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create maintenance record",
    description="Create a new maintenance record for a vehicle. "
                "Rule 9: automatically sets the vehicle status to 'In Shop'.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Vehicle not found"},
    },
)
def create_maintenance(
    payload: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    log = MaintenanceLog(
        vehicle_id=payload.vehicle_id,
        service_type=payload.service_type,
        description=payload.description,
        cost=payload.cost,
        odometer_at_service_km=payload.odometer_at_service_km,
        status=MaintenanceStatus.Open,
    )
    db.add(log)

    # Rule 9: Creating an active maintenance record sets vehicle status to In Shop.
    vehicle.status = VehicleStatus.In_Shop

    db.commit()
    db.refresh(log)
    return log


@router.post(
    "/{log_id}/close",
    response_model=MaintenanceResponse,
    summary="Close a maintenance record",
    description="Close an open maintenance record. "
                "Rule 10: restores vehicle to 'Available' unless 'Retired'.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Maintenance log not found"},
        409: {"description": "Maintenance log already closed"},
    },
)
def close_maintenance(
    log_id: str,
    payload: MaintenanceClose | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
    if log.status == MaintenanceStatus.Closed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Maintenance record is already closed.",
        )

    log.status = MaintenanceStatus.Closed
    log.closed_at = datetime.utcnow()

    if payload:
        if payload.cost is not None:
            log.cost = payload.cost
        if payload.description is not None:
            log.description = payload.description

    # Rule 10: Closing maintenance restores vehicle to Available unless Retired.
    vehicle = db.query(Vehicle).filter(Vehicle.id == log.vehicle_id).first()
    if vehicle and vehicle.status != VehicleStatus.Retired:
        vehicle.status = VehicleStatus.Available

    db.commit()
    db.refresh(log)
    return log
