"""
Fuel & Expense router — full CRUD with filtering, pagination, and summaries.

RBAC:
  fleet_manager       — full CRUD on both
  driver              — create/view own fuel logs
  financial_analyst   — full CRUD on both
  safety_officer      — no access
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, Driver, FuelLog, Expense, MaintenanceLog, UserRole,
)
from app.schemas import (
    FuelLogCreate, FuelLogUpdate, FuelLogResponse,
    ExpenseCreate, ExpenseUpdate, ExpenseResponse,
    FuelExpenseSummary,
)
from app.deps import get_current_user, require_role

router = APIRouter(prefix="/fuel-expense", tags=["Fuel & Expense"])

WRITE_ROLES = [UserRole.fleet_manager, UserRole.driver, UserRole.financial_analyst]
MANAGE_ROLES = [UserRole.fleet_manager, UserRole.financial_analyst]


def _enrich_fuel_log(log: FuelLog) -> dict:
    """Build FuelLogResponse dict with vehicle registration and driver name."""
    data = {
        "id": log.id,
        "vehicle_id": log.vehicle_id,
        "driver_id": log.driver_id,
        "trip_id": log.trip_id,
        "liters": log.liters,
        "cost": log.cost,
        "date": log.date,
        "odometer_km": log.odometer_km,
        "vehicle_registration": log.vehicle.registration_number if log.vehicle else None,
        "driver_name": log.driver.name if log.driver else None,
        "mileage_kmpl": None,
    }
    return data


def _enrich_expense(exp: Expense) -> dict:
    """Build ExpenseResponse dict with vehicle registration and driver name."""
    return {
        "id": exp.id,
        "vehicle_id": exp.vehicle_id,
        "driver_id": exp.driver_id,
        "category": exp.category,
        "amount": exp.amount,
        "date": exp.date,
        "description": exp.description,
        "notes": exp.notes,
        "vehicle_registration": exp.vehicle.registration_number if exp.vehicle else None,
        "driver_name": exp.driver.name if exp.driver else None,
    }


# ──────────────────────────── Fuel Logs ────────────────────────────

@router.get(
    "/fuel",
    summary="List fuel logs",
    description="Returns fuel logs with optional filters and pagination.",
    responses={401: {"description": "Not authenticated"}},
)
def list_fuel_logs(
    vehicle_id: Optional[str] = Query(None),
    driver_id: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(FuelLog)
    if vehicle_id:
        query = query.filter(FuelLog.vehicle_id == vehicle_id)
    if driver_id:
        query = query.filter(FuelLog.driver_id == driver_id)
    if date_from:
        query = query.filter(FuelLog.date >= date_from)
    if date_to:
        query = query.filter(FuelLog.date <= date_to)

    total = query.count()
    items = (
        query.order_by(FuelLog.date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [_enrich_fuel_log(log) for log in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post(
    "/fuel",
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
    current_user: User = Depends(require_role(WRITE_ROLES)),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if payload.driver_id:
        driver = db.query(Driver).filter(Driver.id == payload.driver_id).first()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
    log = FuelLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return _enrich_fuel_log(log)


@router.put(
    "/fuel/{fuel_id}",
    summary="Update a fuel log",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Fuel log not found"},
    },
)
def update_fuel_log(
    fuel_id: str,
    payload: FuelLogUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(MANAGE_ROLES)),
):
    log = db.query(FuelLog).filter(FuelLog.id == fuel_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Fuel log not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "vehicle_id" in update_data:
        vehicle = db.query(Vehicle).filter(Vehicle.id == update_data["vehicle_id"]).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")

    for field, value in update_data.items():
        setattr(log, field, value)
    db.commit()
    db.refresh(log)
    return _enrich_fuel_log(log)


@router.delete(
    "/fuel/{fuel_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a fuel log",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Fuel log not found"},
    },
)
def delete_fuel_log(
    fuel_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(MANAGE_ROLES)),
):
    log = db.query(FuelLog).filter(FuelLog.id == fuel_id).first()
    if not log:
        raise HTTPException(status_code=404, detail="Fuel log not found")
    db.delete(log)
    db.commit()


# ──────────────────────────── Expenses ────────────────────────────

@router.get(
    "/expenses",
    summary="List expenses",
    description="Returns expenses with optional filters and pagination.",
    responses={401: {"description": "Not authenticated"}},
)
def list_expenses(
    vehicle_id: Optional[str] = Query(None),
    driver_id: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(Expense)
    if vehicle_id:
        query = query.filter(Expense.vehicle_id == vehicle_id)
    if driver_id:
        query = query.filter(Expense.driver_id == driver_id)
    if category:
        query = query.filter(Expense.category == category)
    if date_from:
        query = query.filter(Expense.date >= date_from)
    if date_to:
        query = query.filter(Expense.date <= date_to)

    total = query.count()
    items = (
        query.order_by(Expense.date.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [_enrich_expense(exp) for exp in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post(
    "/expenses",
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
    current_user: User = Depends(require_role(MANAGE_ROLES)),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == payload.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if payload.driver_id:
        driver = db.query(Driver).filter(Driver.id == payload.driver_id).first()
        if not driver:
            raise HTTPException(status_code=404, detail="Driver not found")
    expense = Expense(**payload.model_dump())
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _enrich_expense(expense)


@router.put(
    "/expenses/{expense_id}",
    summary="Update an expense",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Expense not found"},
    },
)
def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(MANAGE_ROLES)),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    update_data = payload.model_dump(exclude_unset=True)
    if "vehicle_id" in update_data:
        vehicle = db.query(Vehicle).filter(Vehicle.id == update_data["vehicle_id"]).first()
        if not vehicle:
            raise HTTPException(status_code=404, detail="Vehicle not found")

    for field, value in update_data.items():
        setattr(expense, field, value)
    db.commit()
    db.refresh(expense)
    return _enrich_expense(expense)


@router.delete(
    "/expenses/{expense_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete an expense",
    responses={
        401: {"description": "Not authenticated"},
        403: {"description": "Insufficient role"},
        404: {"description": "Expense not found"},
    },
)
def delete_expense(
    expense_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(MANAGE_ROLES)),
):
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    db.delete(expense)
    db.commit()


# ──────────────────────────── Summaries ────────────────────────────

@router.get(
    "/summary",
    response_model=FuelExpenseSummary,
    summary="Get fuel & expense summaries",
    description="Monthly, vehicle-wise, and driver-wise summaries.",
    responses={401: {"description": "Not authenticated"}},
)
def get_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Fuel totals
    fuel_q = db.query(FuelLog)
    exp_q = db.query(Expense)
    if date_from:
        fuel_q = fuel_q.filter(FuelLog.date >= date_from)
        exp_q = exp_q.filter(Expense.date >= date_from)
    if date_to:
        fuel_q = fuel_q.filter(FuelLog.date <= date_to)
        exp_q = exp_q.filter(Expense.date <= date_to)

    total_fuel_cost = float(fuel_q.with_entities(func.coalesce(func.sum(FuelLog.cost), 0.0)).scalar())
    total_fuel_liters = float(fuel_q.with_entities(func.coalesce(func.sum(FuelLog.liters), 0.0)).scalar())
    total_expense_amount = float(exp_q.with_entities(func.coalesce(func.sum(Expense.amount), 0.0)).scalar())

    # Monthly fuel
    monthly_fuel_rows = (
        fuel_q.with_entities(
            extract("year", FuelLog.date).label("yr"),
            extract("month", FuelLog.date).label("mo"),
            func.sum(FuelLog.cost).label("total"),
        )
        .group_by("yr", "mo")
        .order_by("yr", "mo")
        .all()
    )
    monthly_fuel = [{"year": int(r.yr), "month": int(r.mo), "total": float(r.total)} for r in monthly_fuel_rows]

    # Monthly expenses
    monthly_exp_rows = (
        exp_q.with_entities(
            extract("year", Expense.date).label("yr"),
            extract("month", Expense.date).label("mo"),
            func.sum(Expense.amount).label("total"),
        )
        .group_by("yr", "mo")
        .order_by("yr", "mo")
        .all()
    )
    monthly_expense = [{"year": int(r.yr), "month": int(r.mo), "total": float(r.total)} for r in monthly_exp_rows]

    # Vehicle-wise totals
    veh_fuel = (
        fuel_q.join(Vehicle)
        .with_entities(Vehicle.registration_number, func.sum(FuelLog.cost).label("fuel"))
        .group_by(Vehicle.registration_number)
        .all()
    )
    veh_exp = (
        exp_q.join(Vehicle)
        .with_entities(Vehicle.registration_number, func.sum(Expense.amount).label("exp"))
        .group_by(Vehicle.registration_number)
        .all()
    )
    fuel_by_veh = {r.registration_number: float(r.fuel) for r in veh_fuel}
    exp_by_veh = {r.registration_number: float(r.exp) for r in veh_exp}
    all_vehs = set(fuel_by_veh.keys()) | set(exp_by_veh.keys())
    vehicle_totals = [
        {"vehicle": v, "fuel_cost": fuel_by_veh.get(v, 0.0), "expense_cost": exp_by_veh.get(v, 0.0),
         "total": fuel_by_veh.get(v, 0.0) + exp_by_veh.get(v, 0.0)}
        for v in sorted(all_vehs)
    ]

    # Driver-wise totals
    drv_fuel = (
        fuel_q.join(Driver, FuelLog.driver_id == Driver.id)
        .with_entities(Driver.name, func.sum(FuelLog.cost).label("fuel"))
        .group_by(Driver.name)
        .all()
    )
    drv_exp = (
        exp_q.join(Driver, Expense.driver_id == Driver.id)
        .with_entities(Driver.name, func.sum(Expense.amount).label("exp"))
        .group_by(Driver.name)
        .all()
    )
    fuel_by_drv = {r.name: float(r.fuel) for r in drv_fuel}
    exp_by_drv = {r.name: float(r.exp) for r in drv_exp}
    all_drvs = set(fuel_by_drv.keys()) | set(exp_by_drv.keys())
    driver_totals = [
        {"driver": d, "fuel_cost": fuel_by_drv.get(d, 0.0), "expense_cost": exp_by_drv.get(d, 0.0),
         "total": fuel_by_drv.get(d, 0.0) + exp_by_drv.get(d, 0.0)}
        for d in sorted(all_drvs)
    ]

    return FuelExpenseSummary(
        total_fuel_cost=total_fuel_cost,
        total_fuel_liters=total_fuel_liters,
        total_expense_amount=total_expense_amount,
        monthly_fuel=monthly_fuel,
        monthly_expense=monthly_expense,
        vehicle_totals=vehicle_totals,
        driver_totals=driver_totals,
    )


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
