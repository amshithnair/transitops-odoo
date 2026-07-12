"""
Driver router — full CRUD with RBAC.

RBAC:
  fleet_manager    — full CRUD
  safety_officer   — update compliance fields (license, safety_score)
  all others       — read-only

Enhanced with: search, status filter, pagination, assigned vehicle info.
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Driver, Vehicle, UserRole
from app.schemas import DriverCreate, DriverUpdate, DriverResponse
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/drivers", tags=["Drivers"])


def _enrich_driver(driver: Driver) -> dict:
    """Build DriverResponse dict with assigned vehicle registration."""
    data = DriverResponse.model_validate(driver).model_dump()
    if driver.assigned_vehicle:
        data["assigned_vehicle_registration"] = driver.assigned_vehicle.registration_number
    return data


@router.get(
    "",
    summary="List all drivers",
    description="Returns drivers with optional search, status filter, and pagination.",
    responses={401: {"description": "Not authenticated"}},
)
def list_drivers(
    search: Optional[str] = Query(None, description="Search name, license, email"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status"),
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Driver)
    if status_filter:
        query = query.filter(Driver.status == status_filter)
    if search:
        term = f"%{search}%"
        query = query.filter(
            or_(
                Driver.name.ilike(term),
                Driver.license_number.ilike(term),
                Driver.email.ilike(term),
            )
        )

    total = query.count()
    items = (
        query.order_by(Driver.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [_enrich_driver(d) for d in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get(
    "/{driver_id}",
    summary="Get driver by ID",
    description="Returns a single driver by UUID.",
    responses={
        401: {"description": "Not authenticated"},
        404: {"description": "Driver not found"},
    },
)
def get_driver(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    return _enrich_driver(driver)


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    summary="Create a new driver",
    description="Register a new driver. Requires fleet_manager role. "
                "License number must be unique.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        409: {"description": "License number already exists"},
    },
)
def create_driver(
    payload: DriverCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    existing = db.query(Driver).filter(
        Driver.license_number == payload.license_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A driver with license number '{payload.license_number}' already exists.",
        )
    # Validate assigned_vehicle_id if provided
    if payload.assigned_vehicle_id:
        vehicle = db.query(Vehicle).filter(Vehicle.id == payload.assigned_vehicle_id).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Assigned vehicle not found")
    driver = Driver(**payload.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return _enrich_driver(driver)


@router.put(
    "/{driver_id}",
    summary="Update a driver",
    description="Update driver fields. fleet_manager: all fields. "
                "safety_officer: compliance fields only (license_*, safety_score, status).",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Driver not found"},
        409: {"description": "License number already exists"},
    },
)
def update_driver(
    driver_id: str,
    payload: DriverUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.fleet_manager, UserRole.safety_officer])
    ),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")

    update_data = payload.model_dump(exclude_unset=True)

    # safety_officer can only update compliance fields
    COMPLIANCE_FIELDS = {
        "license_number", "license_category", "license_expiry_date",
        "safety_score", "status",
    }
    if current_user.role == UserRole.safety_officer:
        non_compliance = set(update_data.keys()) - COMPLIANCE_FIELDS
        if non_compliance:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Safety officers can only update compliance fields. "
                       f"Cannot update: {non_compliance}",
            )

    # Check license_number uniqueness if changed
    if "license_number" in update_data:
        existing = db.query(Driver).filter(
            Driver.license_number == update_data["license_number"],
            Driver.id != driver_id,
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"A driver with license number '{update_data['license_number']}' already exists.",
            )

    # Validate assigned_vehicle_id if provided
    if "assigned_vehicle_id" in update_data and update_data["assigned_vehicle_id"]:
        vehicle = db.query(Vehicle).filter(Vehicle.id == update_data["assigned_vehicle_id"]).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Assigned vehicle not found")

    for field, value in update_data.items():
        setattr(driver, field, value)
    db.commit()
    db.refresh(driver)
    return _enrich_driver(driver)


@router.delete(
    "/{driver_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a driver",
    description="Delete a driver by ID. Requires fleet_manager role.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Driver not found"},
    },
)
def delete_driver(
    driver_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager])),
):
    driver = db.query(Driver).filter(Driver.id == driver_id).first()
    if not driver:
        raise HTTPException(status_code=404, detail="Driver not found")
    db.delete(driver)
    db.commit()
