"""
Driver router — full CRUD with RBAC.

RBAC:
  fleet_manager    — full CRUD
  safety_officer   — update compliance fields (license, safety_score)
  all others       — read-only
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Driver, UserRole
from app.schemas import DriverCreate, DriverUpdate, DriverResponse
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/drivers", tags=["Drivers"])


@router.get(
    "",
    response_model=list[DriverResponse],
    summary="List all drivers",
    description="Returns all drivers.",
    responses={401: {"description": "Not authenticated"}},
)
def list_drivers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return db.query(Driver).order_by(Driver.created_at.desc()).all()


@router.get(
    "/{driver_id}",
    response_model=DriverResponse,
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
    return driver


@router.post(
    "",
    response_model=DriverResponse,
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
    driver = Driver(**payload.model_dump())
    db.add(driver)
    db.commit()
    db.refresh(driver)
    return driver


@router.put(
    "/{driver_id}",
    response_model=DriverResponse,
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

    for field, value in update_data.items():
        setattr(driver, field, value)
    db.commit()
    db.refresh(driver)
    return driver


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
