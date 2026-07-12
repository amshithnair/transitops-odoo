"""
Reports router — analytics endpoints with CSV export and filters.

Reports:
  - Fuel Efficiency = Distance / Fuel per vehicle
  - Fleet Utilization = vehicles On Trip / total active vehicles
  - Operational Cost = Fuel + Maintenance + Expenses per vehicle
  - Vehicle ROI = (Revenue − costs) / Acquisition Cost
  - Summary = aggregate KPIs + monthly revenue + costliest vehicles

All reports support: date_from, date_to, vehicle_id, driver_id filters.
CSV export endpoints respect the same filters.

RBAC:
  fleet_manager, safety_officer, financial_analyst — full access
  driver — no access
"""

import csv
import io
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import func, extract
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, Trip, FuelLog, MaintenanceLog, Expense, UserRole,
    VehicleStatus, TripStatus,
)
from app.schemas import (
    FuelEfficiencyReport, FleetUtilizationReport,
    OperationalCostReport, VehicleROIReport, ReportSummary,
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

def _compute_fuel_efficiency(
    db: Session,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    vehicle_id: Optional[str] = None,
) -> list[dict]:
    """Compute fuel efficiency per vehicle from FuelLog and Trip data."""
    vq = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.Retired)
    if vehicle_id:
        vq = vq.filter(Vehicle.id == vehicle_id)
    vehicles = vq.all()

    results = []
    for v in vehicles:
        # Total distance from completed trips
        dist_q = db.query(
            func.coalesce(func.sum(Trip.actual_distance_km), 0.0)
        ).filter(
            Trip.vehicle_id == v.id,
            Trip.status == TripStatus.Completed,
        )
        if date_from:
            dist_q = dist_q.filter(Trip.completed_at >= date_from)
        if date_to:
            dist_q = dist_q.filter(Trip.completed_at <= date_to)
        total_distance = dist_q.scalar()

        # Total fuel from FuelLog
        fuel_q = db.query(
            func.coalesce(func.sum(FuelLog.liters), 0.0)
        ).filter(FuelLog.vehicle_id == v.id)
        if date_from:
            fuel_q = fuel_q.filter(FuelLog.date >= date_from)
        if date_to:
            fuel_q = fuel_q.filter(FuelLog.date <= date_to)
        total_fuel = fuel_q.scalar()

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
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def fuel_efficiency_report(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    vehicle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _compute_fuel_efficiency(db, date_from, date_to, vehicle_id)


@router.get(
    "/fuel-efficiency/csv",
    summary="Fuel efficiency report (CSV)",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def fuel_efficiency_csv(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    vehicle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _csv_response(_compute_fuel_efficiency(db, date_from, date_to, vehicle_id), "fuel_efficiency.csv")


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

def _compute_operational_cost(
    db: Session,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    vehicle_id: Optional[str] = None,
) -> list[dict]:
    vq = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.Retired)
    if vehicle_id:
        vq = vq.filter(Vehicle.id == vehicle_id)
    vehicles = vq.all()

    results = []
    for v in vehicles:
        fuel_q = db.query(func.coalesce(func.sum(FuelLog.cost), 0.0)).filter(FuelLog.vehicle_id == v.id)
        maint_q = db.query(func.coalesce(func.sum(MaintenanceLog.cost), 0.0)).filter(MaintenanceLog.vehicle_id == v.id)
        exp_q = db.query(func.coalesce(func.sum(Expense.amount), 0.0)).filter(Expense.vehicle_id == v.id)

        if date_from:
            fuel_q = fuel_q.filter(FuelLog.date >= date_from)
            exp_q = exp_q.filter(Expense.date >= date_from)
        if date_to:
            fuel_q = fuel_q.filter(FuelLog.date <= date_to)
            exp_q = exp_q.filter(Expense.date <= date_to)

        fuel_cost = float(fuel_q.scalar())
        maintenance_cost = float(maint_q.scalar())
        expense_cost = float(exp_q.scalar())

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
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def operational_cost_report(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    vehicle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _compute_operational_cost(db, date_from, date_to, vehicle_id)


@router.get(
    "/operational-cost/csv",
    summary="Operational cost report (CSV)",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def operational_cost_csv(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    vehicle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _csv_response(
        _compute_operational_cost(db, date_from, date_to, vehicle_id),
        "operational_cost.csv",
    )


# ──────────────────────────── Vehicle ROI ────────────────────────────

def _compute_vehicle_roi(
    db: Session,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    vehicle_id: Optional[str] = None,
) -> list[dict]:
    vq = db.query(Vehicle).filter(Vehicle.status != VehicleStatus.Retired)
    if vehicle_id:
        vq = vq.filter(Vehicle.id == vehicle_id)
    vehicles = vq.all()

    results = []
    for v in vehicles:
        rev_q = db.query(
            func.coalesce(func.sum(Trip.revenue), 0.0)
        ).filter(
            Trip.vehicle_id == v.id,
            Trip.status == TripStatus.Completed,
        )
        if date_from:
            rev_q = rev_q.filter(Trip.completed_at >= date_from)
        if date_to:
            rev_q = rev_q.filter(Trip.completed_at <= date_to)
        total_revenue = float(rev_q.scalar())

        fuel_q = db.query(func.coalesce(func.sum(FuelLog.cost), 0.0)).filter(FuelLog.vehicle_id == v.id)
        maint_q = db.query(func.coalesce(func.sum(MaintenanceLog.cost), 0.0)).filter(MaintenanceLog.vehicle_id == v.id)
        if date_from:
            fuel_q = fuel_q.filter(FuelLog.date >= date_from)
        if date_to:
            fuel_q = fuel_q.filter(FuelLog.date <= date_to)

        total_cost = float(fuel_q.scalar()) + float(maint_q.scalar())
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
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def vehicle_roi_report(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    vehicle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _compute_vehicle_roi(db, date_from, date_to, vehicle_id)


@router.get(
    "/vehicle-roi/csv",
    summary="Vehicle ROI report (CSV)",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def vehicle_roi_csv(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    vehicle_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    return _csv_response(
        _compute_vehicle_roi(db, date_from, date_to, vehicle_id),
        "vehicle_roi.csv",
    )


# ──────────────────────────── Summary ────────────────────────────

@router.get(
    "/summary",
    response_model=ReportSummary,
    summary="Aggregate report summary",
    description="Returns fuel efficiency, fleet utilization, operational cost, ROI, "
                "monthly revenue, and costliest vehicles.",
    responses={401: {"description": "Not authenticated"}, 403: {"description": "Insufficient role"}},
)
def report_summary(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role(REPORT_ROLES)),
):
    # Fuel efficiency aggregate
    fuel_data = _compute_fuel_efficiency(db, date_from, date_to)
    total_dist = sum(r["total_distance_km"] for r in fuel_data)
    total_fuel = sum(r["total_fuel_liters"] for r in fuel_data)
    fuel_eff = round(total_dist / total_fuel, 1) if total_fuel > 0 else None

    # Fleet utilization
    util = _compute_fleet_utilization(db)

    # Operational cost aggregate
    cost_data = _compute_operational_cost(db, date_from, date_to)
    total_ops_cost = sum(r["total_cost"] for r in cost_data)

    # ROI aggregate
    roi_data = _compute_vehicle_roi(db, date_from, date_to)
    roi_values = [r["roi_pct"] for r in roi_data if r["roi_pct"] is not None]
    avg_roi = round(sum(roi_values) / len(roi_values), 1) if roi_values else None

    # Monthly revenue from completed trips
    rev_q = db.query(
        extract("year", Trip.completed_at).label("yr"),
        extract("month", Trip.completed_at).label("mo"),
        func.sum(Trip.revenue).label("rev"),
    ).filter(Trip.status == TripStatus.Completed, Trip.completed_at.isnot(None))
    if date_from:
        rev_q = rev_q.filter(Trip.completed_at >= date_from)
    if date_to:
        rev_q = rev_q.filter(Trip.completed_at <= date_to)
    rev_rows = rev_q.group_by("yr", "mo").order_by("yr", "mo").all()

    month_names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    monthly_revenue = [
        {"month": month_names[int(r.mo)], "value": float(r.rev)}
        for r in rev_rows
    ]

    # Costliest vehicles (top 5)
    costliest = sorted(cost_data, key=lambda x: x["total_cost"], reverse=True)[:5]
    costliest_vehicles = [
        {"label": r["registration_number"], "value": r["total_cost"]}
        for r in costliest
    ]

    return ReportSummary(
        fuel_efficiency_kmpl=fuel_eff,
        fleet_utilization_pct=util["utilization_pct"],
        operational_cost=total_ops_cost,
        vehicle_roi_pct=avg_roi,
        monthly_revenue=monthly_revenue,
        costliest_vehicles=costliest_vehicles,
    )
