"""
Reports router — analytics endpoints with CSV export.

Reports:
  - Fuel Efficiency = Distance / Fuel per vehicle (aggregated from FuelLog + Trip)
  - Fleet Utilization = vehicles On Trip / total active vehicles
  - Operational Cost = Fuel + Maintenance + Expenses per vehicle
  - Vehicle ROI = (Revenue − costs) / Acquisition Cost

CSV export endpoint for each report.

RBAC:
  fleet_manager, safety_officer, financial_analyst — full access
  driver — no access
"""

import csv
import io
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, Trip, FuelLog, MaintenanceLog, Expense, UserRole,
    VehicleStatus, TripStatus,
)
from app.schemas import (
    FuelEfficiencyReport, FleetUtilizationReport,
    OperationalCostReport, VehicleROIReport,
)
from app.deps import require_role

router = APIRouter(prefix="/reports", tags=["Reports"])

REPORT_ROLES = [UserRole.fleet_manager, UserRole.safety_officer, UserRole.financial_analyst]


def _csv_response(rows: list[dict], filename: str) -> StreamingResponse:
    """Generate a CSV streaming response from a list of dicts."""
    if not rows:
        output = io.StringIO()
        output.write("No data")
        output.seek(0)
    else:
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
        output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ──────────────────────────── Fuel Efficiency ────────────────────────────

def _compute_fuel_efficiency(db: Session) -> list[dict]:
    """Compute fuel efficiency per vehicle from FuelLog (canonical source) and Trip data."""
    vehicles = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.Retired).all()
    results = []
    for v in vehicles:
        # Total distance from completed trips
        total_distance = db.query(
            func.coalesce(func.sum(Trip.actual_distance_km), 0.0)
        ).filter(
            Trip.vehicle_id == v.id,
            Trip.status == TripStatus.Completed,
        ).scalar()

        # Total fuel from FuelLog (canonical source — design decision #1)
        total_fuel = db.query(
            func.coalesce(func.sum(FuelLog.liters), 0.0)
        ).filter(FuelLog.vehicle_id == v.id).scalar()

        efficiency = (
            round(float(total_distance) / float(total_fuel), 2)
            if total_fuel > 0 else None
        )

        results.append({
            "vehicle_id": v.id,
            "registration_number": v.registration_number,
            "total_distance_km": float(total_distance),
            "total_fuel_liters": float(total_fuel),
            "efficiency_km_per_liter": efficiency,
        })
    return results


@router.get(
    "/fuel-efficiency",
    response_model=list[FuelEfficiencyReport],
    summary="Fuel efficiency report",
    description="Distance / Fuel per vehicle. Fuel data sourced from FuelLog (canonical).",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def fuel_efficiency_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _compute_fuel_efficiency(db)


@router.get(
    "/fuel-efficiency/csv",
    summary="Fuel efficiency report (CSV)",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def fuel_efficiency_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _csv_response(_compute_fuel_efficiency(db), "fuel_efficiency.csv")


# ──────────────────────────── Fleet Utilization ────────────────────────────

def _compute_fleet_utilization(db: Session) -> dict:
    total_active = db.query(Vehicle).filter(
        Vehicle.status != VehicleStatus.Retired
    ).count()
    on_trip = db.query(Vehicle).filter(
        Vehicle.status == VehicleStatus.On_Trip
    ).count()
    utilization = (on_trip / total_active * 100) if total_active > 0 else 0.0
    return {
        "total_active_vehicles": total_active,
        "vehicles_on_trip": on_trip,
        "utilization_pct": round(utilization, 1),
    }


@router.get(
    "/fleet-utilization",
    response_model=FleetUtilizationReport,
    summary="Fleet utilization report",
    description="Vehicles On Trip / total active vehicles.",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def fleet_utilization_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _compute_fleet_utilization(db)


@router.get(
    "/fleet-utilization/csv",
    summary="Fleet utilization report (CSV)",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def fleet_utilization_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _csv_response([_compute_fleet_utilization(db)], "fleet_utilization.csv")


# ──────────────────────────── Operational Cost ────────────────────────────

def _compute_operational_cost(db: Session) -> list[dict]:
    vehicles = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.Retired).all()
    results = []
    for v in vehicles:
        fuel_cost = float(db.query(
            func.coalesce(func.sum(FuelLog.cost), 0.0)
        ).filter(FuelLog.vehicle_id == v.id).scalar())

        maintenance_cost = float(db.query(
            func.coalesce(func.sum(MaintenanceLog.cost), 0.0)
        ).filter(MaintenanceLog.vehicle_id == v.id).scalar())

        expense_cost = float(db.query(
            func.coalesce(func.sum(Expense.amount), 0.0)
        ).filter(Expense.vehicle_id == v.id).scalar())

        results.append({
            "vehicle_id": v.id,
            "registration_number": v.registration_number,
            "fuel_cost": fuel_cost,
            "maintenance_cost": maintenance_cost,
            "expense_cost": expense_cost,
            "total_cost": fuel_cost + maintenance_cost + expense_cost,
        })
    return results


@router.get(
    "/operational-cost",
    response_model=list[OperationalCostReport],
    summary="Operational cost report",
    description="Fuel + Maintenance + Expenses per vehicle.",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def operational_cost_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _compute_operational_cost(db)


@router.get(
    "/operational-cost/csv",
    summary="Operational cost report (CSV)",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def operational_cost_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _csv_response(_compute_operational_cost(db), "operational_cost.csv")


# ──────────────────────────── Vehicle ROI ────────────────────────────

def _compute_vehicle_roi(db: Session) -> list[dict]:
    vehicles = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.Retired).all()
    results = []
    for v in vehicles:
        total_revenue = float(db.query(
            func.coalesce(func.sum(Trip.revenue), 0.0)
        ).filter(
            Trip.vehicle_id == v.id,
            Trip.status == TripStatus.Completed,
        ).scalar())

        fuel_cost = float(db.query(
            func.coalesce(func.sum(FuelLog.cost), 0.0)
        ).filter(FuelLog.vehicle_id == v.id).scalar())

        maintenance_cost = float(db.query(
            func.coalesce(func.sum(MaintenanceLog.cost), 0.0)
        ).filter(MaintenanceLog.vehicle_id == v.id).scalar())

        total_cost = fuel_cost + maintenance_cost
        roi = (
            round((total_revenue - total_cost) / v.acquisition_cost * 100, 2)
            if v.acquisition_cost > 0 else None
        )

        results.append({
            "vehicle_id": v.id,
            "registration_number": v.registration_number,
            "total_revenue": total_revenue,
            "total_cost": total_cost,
            "acquisition_cost": v.acquisition_cost,
            "roi_pct": roi,
        })
    return results


@router.get(
    "/vehicle-roi",
    response_model=list[VehicleROIReport],
    summary="Vehicle ROI report",
    description="(Revenue − (Maintenance + Fuel)) / Acquisition Cost per vehicle.",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def vehicle_roi_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _compute_vehicle_roi(db)


@router.get(
    "/vehicle-roi/csv",
    summary="Vehicle ROI report (CSV)",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def vehicle_roi_csv(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _csv_response(_compute_vehicle_roi(db), "vehicle_roi.csv")
