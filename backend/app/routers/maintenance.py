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

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, MaintenanceLog, UserRole,
    VehicleStatus, MaintenanceStatus,
)
from app.schemas import MaintenanceCreate, MaintenanceClose, MaintenanceResponse, MaintenanceUpdate
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])


@router.get(
    "",
    response_model=list[MaintenanceResponse],
    summary="List maintenance logs",
    description="Returns all maintenance logs. Optional filters by vehicle_id and status.",
    responses={401: {"description": "Not authenticated"}},
)
def list_maintenance(
    vehicle_id: str | None = Query(None, description="Filter by vehicle ID"),
    maint_status: MaintenanceStatus | None = Query(None, alias="status", description="Filter by status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(MaintenanceLog)
    if vehicle_id:
        query = query.filter(MaintenanceLog.vehicle_id == vehicle_id)
    if maint_status:
        query = query.filter(MaintenanceLog.status == maint_status)
    return query.order_by(MaintenanceLog.opened_at.desc()).all()


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
    vehicle = db.query(Vehicle).filter(Vehicle.registration_number == payload.vehicle_label).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    log = MaintenanceLog(
        vehicle_id=vehicle.id,
        service_type=payload.service_type,
        description=payload.description,
        cost=payload.cost,
        odometer_at_service_km=payload.odometer_at_service_km,
        status=MaintenanceStatus.Active,
    )
    db.add(log)

    # Rule 9: Creating an active maintenance record sets vehicle status to In Shop.
    vehicle.status = VehicleStatus.In_Shop

    db.commit()
    db.refresh(log)
    return log


@router.patch(
    "/{log_id}",
    response_model=MaintenanceResponse,
    summary="Update maintenance log status",
    responses={
        401: {"description": "Not authenticated"},
        404: {"description": "Maintenance log not found"},
    },
)
def update_maintenance(
    log_id: str,
    payload: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")

    vehicle = db.query(Vehicle).filter(Vehicle.id == log.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if payload.status == MaintenanceStatus.Closed and log.status != MaintenanceStatus.Closed:
        # Close logic
        log.status = MaintenanceStatus.Closed
        log.closed_at = datetime.utcnow()
        if vehicle.status != VehicleStatus.Retired:
            vehicle.status = VehicleStatus.Available
    elif payload.status == MaintenanceStatus.Active and log.status != MaintenanceStatus.Active:
        # Reopen logic
        log.status = MaintenanceStatus.Active
        log.closed_at = None
        if vehicle.status != VehicleStatus.Retired:
            vehicle.status = VehicleStatus.In_Shop

    db.commit()
    db.refresh(log)
    return log


@router.post(
    "/{log_id}/close",
    response_model=MaintenanceResponse,
    summary="Close maintenance record",
    description="Close an open maintenance record. "
                "Rule 10: restores vehicle status to 'Available' (unless Retired).",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Log not found"},
        409: {"description": "Log already closed"},
    },
)
def close_maintenance(
    log_id: str,
    payload: MaintenanceClose,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    log = db.query(MaintenanceLog).filter(MaintenanceLog.id == log_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Maintenance log not found")
    if log.status == MaintenanceStatus.Closed:
        raise HTTPException(status_code=409, detail="Maintenance log is already closed")

    vehicle = db.query(Vehicle).filter(Vehicle.id == log.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    log.cost = payload.cost if payload.cost is not None else log.cost
    log.description = payload.description if payload.description is not None else log.description
    log.status = MaintenanceStatus.Closed
    log.closed_at = datetime.utcnow()

    # Rule 10: Closing restores vehicle to Available, unless Retired
    if vehicle.status != VehicleStatus.Retired:
        vehicle.status = VehicleStatus.Available

    db.commit()
    db.refresh(log)
    return log
