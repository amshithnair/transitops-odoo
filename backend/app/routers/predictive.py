"""
Predictive Maintenance router.

Endpoints:
  GET /vehicles/{id}/maintenance-forecast
  GET /maintenance/forecast
"""

from datetime import datetime, timedelta
from typing import List, Optional
from collections import defaultdict

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Vehicle, MaintenanceLog, MaintenanceStatus, UserRole
from app.schemas import MaintenanceForecastResponse, ForecastItem, LastMaintenanceInfo
from app.deps import get_current_user, require_role

router = APIRouter(tags=["Predictive Maintenance"])


def _generate_forecast_for_vehicle(vehicle: Vehicle, logs: List[MaintenanceLog]) -> MaintenanceForecastResponse:
    upcoming = []
    
    # Get closed logs sorted by date descending
    closed_logs = sorted(
        [log for log in logs if log.status == MaintenanceStatus.Closed and log.closed_at],
        key=lambda x: x.closed_at,
        reverse=True
    )
    
    last_info = None
    if closed_logs:
        last = closed_logs[0]
        last_info = LastMaintenanceInfo(
            service_type=last.service_type,
            closed_at=last.closed_at,
            odometer_km=last.odometer_at_service_km
        )

    # 1. Odometer-based rule: +10,000 km since last service
    if last_info and last_info.odometer_km is not None:
        km_since = vehicle.odometer_km - last_info.odometer_km
        if km_since >= 10000:
            upcoming.append(ForecastItem(
                predicted_date=datetime.utcnow().date(),
                service_type="Routine Inspection (Mileage)",
                reason=f"Vehicle has travelled {km_since} km since last service (Threshold: 10,000 km).",
                urgency="High",
                estimated_cost=250.0
            ))
        elif km_since >= 8000:
            upcoming.append(ForecastItem(
                predicted_date=(datetime.utcnow() + timedelta(days=14)).date(),
                service_type="Routine Inspection (Mileage)",
                reason=f"Approaching mileage limit ({km_since} km).",
                urgency="Medium",
                estimated_cost=250.0
            ))

    # 2. Time-based rule: >= 180 days since last service
    if last_info and last_info.closed_at:
        days_since = (datetime.utcnow() - last_info.closed_at).days
        if days_since >= 180:
            upcoming.append(ForecastItem(
                predicted_date=datetime.utcnow().date(),
                service_type="Time-based Maintenance",
                reason=f"180+ days since last service ({days_since} days).",
                urgency="High",
                estimated_cost=150.0
            ))

    # 3. Recurring pattern rule: same service_type 3+ times in last 12 months
    twelve_months_ago = datetime.utcnow() - timedelta(days=365)
    recent_logs = [log for log in closed_logs if log.closed_at >= twelve_months_ago]
    
    service_counts = defaultdict(list)
    for log in recent_logs:
        service_counts[log.service_type].append(log)
        
    for service_type, occurrences in service_counts.items():
        if len(occurrences) >= 3:
            # Predict next occurrence based on average interval
            occurrences.sort(key=lambda x: x.closed_at)
            intervals = [(occurrences[i+1].closed_at - occurrences[i].closed_at).days for i in range(len(occurrences)-1)]
            avg_interval = sum(intervals) / len(intervals) if intervals else 0
            
            next_date = occurrences[-1].closed_at + timedelta(days=avg_interval)
            
            # If next_date is in the past or very soon, urgency is High
            days_to_next = (next_date - datetime.utcnow()).days
            urgency = "High" if days_to_next <= 7 else "Medium"
            
            upcoming.append(ForecastItem(
                predicted_date=next_date.date(),
                service_type=service_type,
                reason=f"Recurring pattern detected: occurred {len(occurrences)} times in last year. Average interval: {avg_interval:.0f} days.",
                urgency=urgency,
                estimated_cost=occurrences[-1].cost if occurrences else None
            ))

    # Sort by urgency (High first) then by date
    urgency_order = {"High": 0, "Medium": 1, "Low": 2}
    upcoming.sort(key=lambda x: (urgency_order.get(x.urgency, 3), x.predicted_date))

    return MaintenanceForecastResponse(
        vehicle_id=vehicle.id,
        next_maintenance=upcoming[0] if upcoming else None,
        upcoming_services=upcoming,
        last_maintenance=last_info
    )


@router.get(
    "/vehicles/{vehicle_id}/maintenance-forecast",
    response_model=MaintenanceForecastResponse,
    summary="Get single vehicle maintenance forecast",
)
def get_vehicle_forecast(
    vehicle_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
        
    logs = db.query(MaintenanceLog).filter(MaintenanceLog.vehicle_id == vehicle_id).all()
    return _generate_forecast_for_vehicle(vehicle, logs)


@router.get(
    "/maintenance/forecast",
    response_model=List[MaintenanceForecastResponse],
    summary="Get fleet-wide maintenance forecasts",
    description="Fleet managers and safety officers only. Optional filter by urgency.",
)
def get_fleet_forecast(
    urgency: str | None = Query(None, description="Filter by urgency (High, Medium, Low)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role([UserRole.fleet_manager, UserRole.safety_officer])),
):
    vehicles = db.query(Vehicle).all()
    # Eager load could be better, but doing N queries for simplicity since N is small
    
    results = []
    for v in vehicles:
        logs = db.query(MaintenanceLog).filter(MaintenanceLog.vehicle_id == v.id).all()
        forecast = _generate_forecast_for_vehicle(v, logs)
        
        if forecast.upcoming_services:
            if urgency:
                filtered_upcoming = [s for s in forecast.upcoming_services if s.urgency == urgency]
                if filtered_upcoming:
                    forecast.upcoming_services = filtered_upcoming
                    forecast.next_maintenance = filtered_upcoming[0]
                    results.append(forecast)
            else:
                results.append(forecast)
                
    return results
