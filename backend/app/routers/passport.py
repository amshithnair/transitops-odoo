"""
Digital Vehicle Passport router.

Endpoint:
  GET /vehicles/{id}/passport — aggregates comprehensive vehicle history.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, Trip, MaintenanceLog, FuelLog, Expense, TripStatus
)
from app.schemas import VehiclePassportResponse, ComplianceEvent, PassportSummaryStats
from app.deps import get_current_user

router = APIRouter(tags=["Vehicle Passport"])


@router.get(
    "/vehicles/{vehicle_id}/passport",
    response_model=VehiclePassportResponse,
    summary="Get Digital Vehicle Passport",
    description="Aggregates complete history for a vehicle: trips, maintenance, "
                "fuel, expenses, and a computed compliance timeline.",
    responses={
        401: {"description": "Not authenticated"},
        404: {"description": "Vehicle not found"},
    },
)
def get_vehicle_passport(
    vehicle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    # Fetch related records
    trips = db.query(Trip).filter(Trip.vehicle_id == vehicle_id).order_by(Trip.created_at.desc()).all()
    maintenance_logs = db.query(MaintenanceLog).filter(MaintenanceLog.vehicle_id == vehicle_id).order_by(MaintenanceLog.opened_at.desc()).all()
    fuel_logs = db.query(FuelLog).filter(FuelLog.vehicle_id == vehicle_id).order_by(FuelLog.date.desc()).all()
    expenses = db.query(Expense).filter(Expense.vehicle_id == vehicle_id).order_by(Expense.date.desc()).all()

    # Build Compliance Timeline
    timeline = []
    
    # Add maintenance events
    for m in maintenance_logs:
        timeline.append(ComplianceEvent(
            timestamp=m.opened_at,
            event=f"Maintenance Opened: {m.service_type}",
            status_before="Available/On Trip",
            status_after="In Shop"
        ))
        if m.closed_at:
            timeline.append(ComplianceEvent(
                timestamp=m.closed_at,
                event=f"Maintenance Closed: {m.service_type}",
                status_before="In Shop",
                status_after="Available"
            ))

    # Add trip dispatch/complete events
    for t in trips:
        if t.dispatched_at:
            timeline.append(ComplianceEvent(
                timestamp=t.dispatched_at,
                event=f"Trip Dispatched: {t.source} to {t.destination}",
                status_before="Available",
                status_after="On Trip"
            ))
        if t.status == TripStatus.Completed and t.completed_at:
            timeline.append(ComplianceEvent(
                timestamp=t.completed_at,
                event=f"Trip Completed: {t.source} to {t.destination}",
                status_before="On Trip",
                status_after="Available"
            ))

    # Sort timeline chronologically (oldest first, or newest first?)
    # Let's do newest first
    timeline.sort(key=lambda x: x.timestamp, reverse=True)

    # Compute Summary Stats
    completed_trips = [t for t in trips if t.status == TripStatus.Completed]
    total_trips = len(completed_trips)
    total_revenue = sum(t.revenue for t in completed_trips)
    total_maintenance_cost = sum(m.cost for m in maintenance_logs)
    total_fuel_cost = sum(f.cost for f in fuel_logs)
    total_expenses = sum(e.amount for e in expenses)
    total_op_cost = total_maintenance_cost + total_fuel_cost + total_expenses

    total_distance = sum(t.actual_distance_km for t in completed_trips if t.actual_distance_km)
    total_fuel_liters = sum(f.liters for f in fuel_logs)
    avg_fuel_efficiency = (total_distance / total_fuel_liters) if total_fuel_liters > 0 else None

    summary = PassportSummaryStats(
        total_trips=total_trips,
        total_revenue=total_revenue,
        total_maintenance_cost=total_maintenance_cost,
        total_fuel_cost=total_fuel_cost,
        total_expenses=total_expenses,
        total_operational_cost=total_op_cost,
        average_fuel_efficiency_km_per_liter=avg_fuel_efficiency
    )

    # Map records to summaries (mostly field mapping handled by Pydantic)
    return {
        "vehicle": vehicle,
        "trip_history": [
            {
                "id": t.id,
                "source": t.source,
                "destination": t.destination,
                "distance_km": t.actual_distance_km or t.planned_distance_km,
                "revenue": t.revenue,
                "status": t.status.value,
                "completed_at": t.completed_at
            } for t in trips
        ],
        "maintenance_history": [
            {
                "id": m.id,
                "service_type": m.service_type,
                "cost": m.cost,
                "opened_at": m.opened_at,
                "closed_at": m.closed_at,
                "status": m.status.value
            } for m in maintenance_logs
        ],
        "fuel_logs": [
            {
                "id": f.id,
                "liters": f.liters,
                "cost": f.cost,
                "date": f.date,
                "odometer_km": f.odometer_km
            } for f in fuel_logs
        ],
        "expenses": [
            {
                "id": e.id,
                "category": e.category.value,
                "amount": e.amount,
                "date": e.date,
                "notes": e.notes
            } for e in expenses
        ],
        "compliance_timeline": timeline,
        "summary": summary
    }
