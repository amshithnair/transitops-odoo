"""
AI Dispatch Recommendation router — deterministic weighted scoring algorithm.

Input: Trip requirements (source, destination, cargo weight, distance, preferred type)
Output: Top 5 ranked (vehicle, driver) pairs with individual scores and reasoning.

Scoring weights:
  - Availability (20%): Both available → full score
  - Capacity fit (15%): Closer to cargo weight → higher (avoid waste)
  - Fuel efficiency (15%): Historical km/liter from FuelLog data
  - Maintenance status (15%): Fewer open issues, days since last maintenance
  - Safety score (20%): Driver's safety_score
  - Vehicle condition (15%): Lower relative odometer → higher
"""

from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Vehicle, Driver, FuelLog, MaintenanceLog, Trip, UserRole,
    VehicleStatus, DriverStatus, TripStatus, MaintenanceStatus,
)
from app.schemas import (
    DispatchRequest, DispatchRecommendation, DispatchScore,
    VehicleResponse, DriverResponse,
)
from app.deps import get_current_user

router = APIRouter(prefix="/dispatch", tags=["AI Dispatch"])

# Scoring weights
W_AVAILABILITY = 0.20
W_CAPACITY = 0.15
W_FUEL_EFF = 0.15
W_MAINTENANCE = 0.15
W_SAFETY = 0.20
W_CONDITION = 0.15


def _score_capacity(vehicle_capacity: float, cargo_weight: float) -> float:
    """Score capacity fit — closer to cargo weight without exceeding = higher."""
    if vehicle_capacity <= 0 or cargo_weight <= 0:
        return 0.0
    ratio = cargo_weight / vehicle_capacity
    if ratio > 1.0:
        return 0.0  # Cannot fit
    # Best when ratio is 0.6-0.9 (efficient use without being too tight)
    if ratio >= 0.6:
        return min(1.0, ratio + 0.1)
    return ratio * 1.2


def _score_fuel_efficiency(db: Session, vehicle_id: str) -> float:
    """Score based on historical fuel efficiency (km/liter)."""
    total_distance = float(db.query(
        func.coalesce(func.sum(Trip.actual_distance_km), 0.0)
    ).filter(
        Trip.vehicle_id == vehicle_id,
        Trip.status == TripStatus.Completed,
    ).scalar())

    total_fuel = float(db.query(
        func.coalesce(func.sum(FuelLog.liters), 0.0)
    ).filter(FuelLog.vehicle_id == vehicle_id).scalar())

    if total_fuel <= 0:
        return 0.5  # No data — neutral score

    efficiency = total_distance / total_fuel
    # Normalize: 5 km/l = 0.3, 10 km/l = 0.6, 15+ km/l = 1.0
    return min(1.0, efficiency / 15.0)


def _score_maintenance(db: Session, vehicle_id: str) -> float:
    """Score based on open maintenance issues."""
    open_count = db.query(MaintenanceLog).filter(
        MaintenanceLog.vehicle_id == vehicle_id,
        MaintenanceLog.status == MaintenanceStatus.Open,
    ).count()

    if open_count == 0:
        return 1.0
    elif open_count == 1:
        return 0.5
    else:
        return 0.2


def _score_condition(odometer: float, fleet_avg_odometer: float) -> float:
    """Score vehicle condition by odometer relative to fleet average."""
    if fleet_avg_odometer <= 0:
        return 0.5
    ratio = odometer / fleet_avg_odometer
    # Lower odometer relative to fleet average = higher score
    if ratio <= 0.5:
        return 1.0
    elif ratio <= 1.0:
        return 0.8
    elif ratio <= 1.5:
        return 0.5
    else:
        return 0.3


@router.post(
    "/recommend",
    response_model=list[DispatchRecommendation],
    summary="Get AI dispatch recommendations",
    description="Returns top 5 (vehicle, driver) pairs ranked by weighted scoring "
                "considering availability, capacity, fuel efficiency, maintenance, "
                "safety score, and vehicle condition.",
    responses={
        401: {"description": "Not authenticated"},
        422: {"description": "No eligible vehicles or drivers found"},
    },
)
def get_recommendations(
    payload: DispatchRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Filter eligible vehicles
    vq = db.query(Vehicle).filter(
        Vehicle.status == VehicleStatus.Available,
        Vehicle.max_load_capacity_kg >= payload.cargo_weight_kg,
    )
    if payload.preferred_vehicle_type:
        # Prefer but don't exclude — we'll boost preferred types
        pass
    eligible_vehicles = vq.all()

    if not eligible_vehicles:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No eligible vehicles found. All vehicles may be unavailable "
                   "or lack sufficient capacity.",
        )

    # Filter eligible drivers
    eligible_drivers = db.query(Driver).filter(
        Driver.status == DriverStatus.Available,
        Driver.license_expiry_date >= date.today(),
    ).all()

    if not eligible_drivers:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="No eligible drivers found. All drivers may be unavailable, "
                   "suspended, or have expired licenses.",
        )

    # Fleet average odometer for condition scoring
    avg_odo_result = db.query(func.avg(Vehicle.odometer_km)).filter(
        Vehicle.status != VehicleStatus.Retired
    ).scalar()
    fleet_avg_odo = float(avg_odo_result) if avg_odo_result else 1.0

    # Score all (vehicle, driver) pairs
    scored_pairs = []
    for vehicle in eligible_vehicles:
        for driver in eligible_drivers:
            # Compute individual scores
            availability = 1.0  # Both are available (pre-filtered)

            capacity = _score_capacity(vehicle.max_load_capacity_kg, payload.cargo_weight_kg)
            fuel_eff = _score_fuel_efficiency(db, vehicle.id)
            maintenance = _score_maintenance(db, vehicle.id)
            safety = driver.safety_score / 100.0
            condition = _score_condition(vehicle.odometer_km, fleet_avg_odo)

            # Preferred vehicle type bonus
            type_bonus = 0.0
            if payload.preferred_vehicle_type and vehicle.type == payload.preferred_vehicle_type:
                type_bonus = 0.05

            total = (
                W_AVAILABILITY * availability +
                W_CAPACITY * capacity +
                W_FUEL_EFF * fuel_eff +
                W_MAINTENANCE * maintenance +
                W_SAFETY * safety +
                W_CONDITION * condition +
                type_bonus
            )

            scores = DispatchScore(
                availability=round(availability * 100, 1),
                capacity_fit=round(capacity * 100, 1),
                fuel_efficiency=round(fuel_eff * 100, 1),
                maintenance_status=round(maintenance * 100, 1),
                safety_score=round(safety * 100, 1),
                vehicle_condition=round(condition * 100, 1),
            )

            # Build reasoning
            reasons = []
            if capacity >= 0.8:
                reasons.append(f"Excellent capacity fit ({vehicle.max_load_capacity_kg}kg for {payload.cargo_weight_kg}kg cargo)")
            elif capacity >= 0.5:
                reasons.append(f"Good capacity match ({vehicle.max_load_capacity_kg}kg capacity)")
            if safety >= 0.9:
                reasons.append(f"Top-tier safety record ({driver.safety_score}/100)")
            if maintenance >= 0.8:
                reasons.append("No open maintenance issues")
            if fuel_eff >= 0.6:
                reasons.append("Good fuel efficiency history")
            if condition >= 0.8:
                reasons.append(f"Low odometer ({vehicle.odometer_km:,.0f} km)")
            if type_bonus > 0:
                reasons.append(f"Matches preferred type: {payload.preferred_vehicle_type}")

            reasoning = ". ".join(reasons) if reasons else "Meets all basic requirements."

            scored_pairs.append({
                "vehicle": vehicle,
                "driver": driver,
                "total_score": round(total * 100, 1),
                "scores": scores,
                "reasoning": reasoning,
            })

    # Sort by total score descending, take top 5
    scored_pairs.sort(key=lambda x: x["total_score"], reverse=True)
    top_pairs = scored_pairs[:5]

    return [
        DispatchRecommendation(
            rank=i + 1,
            vehicle=VehicleResponse.model_validate(p["vehicle"]),
            driver=DriverResponse.model_validate(p["driver"]),
            total_score=p["total_score"],
            scores=p["scores"],
            reasoning=p["reasoning"],
        )
        for i, p in enumerate(top_pairs)
    ]
