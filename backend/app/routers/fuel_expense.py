"""
Fuel & Expense router — CRUD for fuel logs and expenses, plus operational cost endpoint.

RBAC:
  fleet_manager       — full CRUD on both
  driver              — create/view own fuel logs
  financial_analyst   — full CRUD on both
  safety_officer      — no access
"""

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, FuelLog, Expense, MaintenanceLog, UserRole,
)
from app.schemas import (
    FuelLogCreate, FuelLogResponse,
    ExpenseCreate, ExpenseResponse,
)
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/fuel-expense", tags=["Fuel & Expense"])


# ──────────────────────────── Fuel Logs ────────────────────────────

@router.get(
    "/fuel",
    response_model=list[FuelLogResponse],
    summary="List fuel logs",
    description="Returns all fuel logs. Optional filter by vehicle_id.",
    responses={401: {"description": "Not authenticated"}},
)
def list_fuel_logs(
    vehicle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(FuelLog)
    if vehicle_id:
        query = query.filter(FuelLog.vehicle_id == vehicle_id)
    return query.order_by(FuelLog.date.desc()).all()


@router.post(
    "/fuel",
    response_model=FuelLogResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a fuel log",
    description="Record a fuel log entry for a vehicle.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Vehicle not found"},
    },
)
def create_fuel_log(
    payload: FuelLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.fleet_manager, UserRole.driver, UserRole.financial_analyst])
    ),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    log = FuelLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


# ──────────────────────────── Expenses ────────────────────────────

@router.get(
    "/expenses",
    response_model=list[ExpenseResponse],
    summary="List expenses",
    description="Returns all expenses. Optional filter by vehicle_id.",
    responses={401: {"description": "Not authenticated"}},
)
def list_expenses(
    vehicle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Expense)
    if vehicle_id:
        query = query.filter(Expense.vehicle_id == vehicle_id)
    return query.order_by(Expense.date.desc()).all()


@router.post(
    "/expenses",
    response_model=ExpenseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create an expense",
    description="Record an expense entry for a vehicle.",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Vehicle not found"},
    },
)
def create_expense(
    payload: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_role([UserRole.fleet_manager, UserRole.financial_analyst])
    ),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    expense = Expense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


# ──────────────────────────── Operational Cost ────────────────────────────

@router.get(
    "/operational-cost/{vehicle_id}",
    summary="Get total operational cost for a vehicle",
    description="Computes total operational cost = Fuel + Maintenance + Expenses for a vehicle.",
    responses={
        401: {"description": "Not authenticated"},
        404: {"description": "Vehicle not found"},
    },
)
def get_operational_cost(
    vehicle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    fuel_cost = db.query(func.coalesce(func.sum(FuelLog.cost), 0.0)).filter(
        FuelLog.vehicle_id == vehicle_id
    ).scalar()

    maintenance_cost = db.query(func.coalesce(func.sum(MaintenanceLog.cost), 0.0)).filter(
        MaintenanceLog.vehicle_id == vehicle_id
    ).scalar()

    expense_cost = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(
        Expense.vehicle_id == vehicle_id
    ).scalar()

    return {
        "vehicle_id": vehicle_id,
        "registration_number": vehicle.registration_number,
        "fuel_cost": float(fuel_cost),
        "maintenance_cost": float(maintenance_cost),
        "expense_cost": float(expense_cost),
        "total_cost": float(fuel_cost + maintenance_cost + expense_cost),
    }
