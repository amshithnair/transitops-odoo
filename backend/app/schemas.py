"""
TransitOps Pydantic v2 schemas.

All request/response models with Field examples for Swagger rendering.
"""

from datetime import datetime, date as date_type
from typing import Optional

from pydantic import BaseModel, Field, EmailStr

from app.models import (
    UserRole, VehicleStatus, DriverStatus, TripStatus,
    MaintenanceStatus, ExpenseCategory,
)


# ──────────────────────────── Auth ────────────────────────────

class UserRegister(BaseModel):
    name: str = Field(..., min_length=1, examples=["Alice Fleet"])
    email: EmailStr = Field(..., examples=["alice@transitops.com"])
    password: str = Field(..., min_length=6, examples=["SecureP@ss1"])
    role: UserRole = Field(..., examples=[UserRole.fleet_manager])


class UserLogin(BaseModel):
    email: EmailStr = Field(..., examples=["alice@transitops.com"])
    password: str = Field(..., examples=["SecureP@ss1"])


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: UserRole
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────── Vehicle ────────────────────────────

class VehicleCreate(BaseModel):
    registration_number: str = Field(..., min_length=1, examples=["VAN-05"])
    name_model: str = Field(..., examples=["Ford Transit 2024"])
    type: str = Field(..., examples=["Van"])
    max_load_capacity_kg: float = Field(..., gt=0, examples=[2500.0])
    odometer_km: float = Field(0.0, ge=0, examples=[15000.0])
    acquisition_cost: float = Field(0.0, ge=0, examples=[45000.0])
    status: VehicleStatus = Field(VehicleStatus.Available, examples=[VehicleStatus.Available])
    region: Optional[str] = Field(None, examples=["North"])


class VehicleUpdate(BaseModel):
    registration_number: Optional[str] = Field(None, examples=["VAN-05"])
    name_model: Optional[str] = Field(None, examples=["Ford Transit 2024"])
    type: Optional[str] = Field(None, examples=["Van"])
    max_load_capacity_kg: Optional[float] = Field(None, gt=0, examples=[2500.0])
    odometer_km: Optional[float] = Field(None, ge=0, examples=[15000.0])
    acquisition_cost: Optional[float] = Field(None, ge=0, examples=[45000.0])
    status: Optional[VehicleStatus] = Field(None, examples=[VehicleStatus.Available])
    region: Optional[str] = Field(None, examples=["North"])


class VehicleResponse(BaseModel):
    id: str
    registration_number: str
    name_model: str
    type: str
    max_load_capacity_kg: float
    odometer_km: float
    acquisition_cost: float
    status: VehicleStatus
    region: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────── Driver ────────────────────────────

class DriverCreate(BaseModel):
    name: str = Field(..., min_length=1, examples=["Alex Johnson"])
    license_number: str = Field(..., min_length=1, examples=["DL-2024-0042"])
    license_category: str = Field(..., examples=["C"])
    license_expiry_date: date_type = Field(..., examples=["2026-12-31"])
    contact_number: Optional[str] = Field(None, examples=["+1-555-0142"])
    safety_score: float = Field(100.0, ge=0, le=100, examples=[95.0])
    status: DriverStatus = Field(DriverStatus.Available, examples=[DriverStatus.Available])


class DriverUpdate(BaseModel):
    name: Optional[str] = Field(None, examples=["Alex Johnson"])
    license_number: Optional[str] = Field(None, examples=["DL-2024-0042"])
    license_category: Optional[str] = Field(None, examples=["C"])
    license_expiry_date: Optional[date_type] = Field(None, examples=["2026-12-31"])
    contact_number: Optional[str] = Field(None, examples=["+1-555-0142"])
    safety_score: Optional[float] = Field(None, ge=0, le=100, examples=[95.0])
    status: Optional[DriverStatus] = Field(None, examples=[DriverStatus.Available])


class DriverResponse(BaseModel):
    id: str
    name: str
    license_number: str
    license_category: str
    license_expiry_date: date_type
    contact_number: Optional[str]
    safety_score: float
    status: DriverStatus
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────── Trip ────────────────────────────

class TripCreate(BaseModel):
    source: str = Field(..., examples=["Warehouse A"])
    destination: str = Field(..., examples=["Distribution Center B"])
    vehicle_id: str = Field(..., examples=["uuid-of-vehicle"])
    driver_id: str = Field(..., examples=["uuid-of-driver"])
    cargo_weight_kg: float = Field(..., gt=0, examples=[1800.0])
    planned_distance_km: float = Field(..., gt=0, examples=[350.0])
    revenue: float = Field(0.0, ge=0, examples=[2500.0])


class TripComplete(BaseModel):
    """Payload for completing a trip — design decisions #1 and #2."""
    actual_distance_km: float = Field(..., gt=0, examples=[345.0])
    fuel_consumed_liters: float = Field(..., gt=0, examples=[42.5])
    final_odometer_km: Optional[float] = Field(
        None, ge=0, examples=[15345.0],
        description="If provided, sets vehicle odometer to this value. "
                    "Otherwise, odometer is incremented by actual_distance_km."
    )


class TripResponse(BaseModel):
    id: str
    source: str
    destination: str
    vehicle_id: str
    driver_id: str
    cargo_weight_kg: float
    planned_distance_km: float
    actual_distance_km: Optional[float]
    fuel_consumed_liters: Optional[float]
    revenue: float
    status: TripStatus
    created_by: str
    dispatched_at: Optional[datetime]
    completed_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    created_at: datetime

    model_config = {"from_attributes": True}


# ──────────────────────────── Maintenance ────────────────────────────

class MaintenanceCreate(BaseModel):
    vehicle_id: str = Field(..., examples=["uuid-of-vehicle"])
    service_type: str = Field(..., examples=["Oil Change"])
    description: Optional[str] = Field(None, examples=["Routine 10k km oil change"])
    cost: float = Field(0.0, ge=0, examples=[250.0])
    odometer_at_service_km: Optional[float] = Field(None, ge=0, examples=[15000.0])


class MaintenanceClose(BaseModel):
    cost: Optional[float] = Field(None, ge=0, examples=[275.0])
    description: Optional[str] = Field(None, examples=["Completed oil change and filter replacement"])


class MaintenanceResponse(BaseModel):
    id: str
    vehicle_id: str
    service_type: str
    description: Optional[str]
    cost: float
    odometer_at_service_km: Optional[float]
    status: MaintenanceStatus
    opened_at: datetime
    closed_at: Optional[datetime]

    model_config = {"from_attributes": True}


# ──────────────────────────── Fuel Log ────────────────────────────

class FuelLogCreate(BaseModel):
    vehicle_id: str = Field(..., examples=["uuid-of-vehicle"])
    trip_id: Optional[str] = Field(None, examples=["uuid-of-trip"])
    liters: float = Field(..., gt=0, examples=[45.0])
    cost: float = Field(..., gt=0, examples=[67.50])
    date: date_type = Field(..., examples=["2026-01-15"])
    odometer_km: Optional[float] = Field(None, ge=0, examples=[15350.0])


class FuelLogResponse(BaseModel):
    id: str
    vehicle_id: str
    trip_id: Optional[str]
    liters: float
    cost: float
    date: date_type
    odometer_km: Optional[float]

    model_config = {"from_attributes": True}


# ──────────────────────────── Expense ────────────────────────────

class ExpenseCreate(BaseModel):
    vehicle_id: str = Field(..., examples=["uuid-of-vehicle"])
    category: ExpenseCategory = Field(..., examples=[ExpenseCategory.Toll])
    amount: float = Field(..., gt=0, examples=[25.00])
    date: date_type = Field(..., examples=["2026-01-15"])
    notes: Optional[str] = Field(None, examples=["Highway toll — Route 66"])


class ExpenseResponse(BaseModel):
    id: str
    vehicle_id: str
    category: ExpenseCategory
    amount: float
    date: date_type
    notes: Optional[str]

    model_config = {"from_attributes": True}


# ──────────────────────────── Dashboard ────────────────────────────

class DashboardKPIs(BaseModel):
    active_vehicles: int = Field(..., examples=[12])
    available_vehicles: int = Field(..., examples=[8])
    vehicles_in_maintenance: int = Field(..., examples=[2])
    active_trips: int = Field(..., examples=[4])
    pending_trips: int = Field(..., examples=[3])
    drivers_on_duty: int = Field(..., examples=[4])
    fleet_utilization_pct: float = Field(..., examples=[33.3])


# ──────────────────────────── Reports ────────────────────────────

class FuelEfficiencyReport(BaseModel):
    vehicle_id: str
    registration_number: str
    total_distance_km: float
    total_fuel_liters: float
    efficiency_km_per_liter: Optional[float]


class FleetUtilizationReport(BaseModel):
    total_active_vehicles: int
    vehicles_on_trip: int
    utilization_pct: float


class OperationalCostReport(BaseModel):
    vehicle_id: str
    registration_number: str
    fuel_cost: float
    maintenance_cost: float
    expense_cost: float
    total_cost: float


class VehicleROIReport(BaseModel):
    vehicle_id: str
    registration_number: str
    total_revenue: float
    total_cost: float
    acquisition_cost: float
    roi_pct: Optional[float]
