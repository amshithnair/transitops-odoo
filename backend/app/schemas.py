"""
TransitOps Pydantic v2 schemas.

All request/response models with Field examples for Swagger rendering.
"""

from datetime import datetime, date as date_type
from typing import Optional, List, Annotated
import re

from pydantic import BaseModel, Field, AfterValidator

def validate_email_relaxed(v: str) -> str:
    pattern = r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}|[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.local$'
    if not re.match(pattern, v):
        raise ValueError('Invalid email format')
    return v.lower()

RelaxedEmailStr = Annotated[str, AfterValidator(validate_email_relaxed)]

from app.models import (
    UserRole, VehicleStatus, DriverStatus, TripStatus,
    MaintenanceStatus, ExpenseCategory,
)


# ──────────────────────────── Auth ────────────────────────────

class UserRegister(BaseModel):
    name: str = Field(..., min_length=1)
    email: RelaxedEmailStr
    password: str = Field(..., min_length=6)
    role: UserRole = UserRole.driver


class UserLogin(BaseModel):
    email: RelaxedEmailStr
    password: str


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
    created_by: Optional[str] = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Password reset flow schemas
class ForgotPasswordRequest(BaseModel):
    email: RelaxedEmailStr = Field(..., examples=["user@example.com"])


class VerifyOTPRequest(BaseModel):
    email: RelaxedEmailStr = Field(..., examples=["user@example.com"])
    otp: str = Field(..., min_length=6, max_length=6, examples=["123456"])


class VerifyOTPResponse(BaseModel):
    reset_code: str
    expires_in: int = Field(600, description="Reset code validity in seconds")


class ResetPasswordRequest(BaseModel):
    email: RelaxedEmailStr = Field(..., examples=["user@example.com"])
    reset_code: str = Field(..., examples=["temp-code-xyz"])
    new_password: str = Field(..., min_length=6, examples=["NewPass@123"])


class MessageResponse(BaseModel):
    message: str


# Fleet manager user creation
class UserCreateByManager(BaseModel):
    name: str = Field(..., min_length=1, examples=["Demo Driver 1"])
    email: RelaxedEmailStr = Field(..., examples=["demo-driver-1@transitops.local"])
    password: str = Field(..., min_length=6, examples=["Demo@123"])
    role: UserRole = Field(..., examples=[UserRole.driver])


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
    user_id: Optional[str] = Field(None, examples=["uuid-of-user"])
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
    user_id: Optional[str]
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
    source: str = Field(..., examples=["Warehouse A, Ahmedabad"])
    destination: str = Field(..., examples=["Store B, Mumbai"])
    vehicle_id: str = Field(..., examples=["uuid-of-vehicle"])
    driver_id: str = Field(..., examples=["uuid-of-driver"])
    cargo_weight_kg: float = Field(..., gt=0, examples=[450.0])
    planned_distance_km: float = Field(..., gt=0, examples=[350.0])
    revenue: float = Field(0.0, ge=0, examples=[5000.0])
    dispatch: bool = False


class TripComplete(BaseModel):
    """Payload for completing a trip."""
    final_odometer: float = Field(..., gt=0, examples=[355.0])
    fuel_consumed: float = Field(..., gt=0, examples=[35.5])
    revenue: float = Field(0.0, ge=0)


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
    vehicle_label: str = Field(..., examples=["KA-01-AB-1234"])
    service_type: str = Field(..., examples=["Oil Change"])
    description: Optional[str] = Field(None, examples=["Routine oil and filter replacement"])
    cost: float = Field(0.0, ge=0, examples=[2500.0])
    odometer_at_service_km: Optional[float] = Field(None, ge=0, examples=[45000.0])

class MaintenanceUpdate(BaseModel):
    status: MaintenanceStatus


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


# ──────────────────────────── Digital Vehicle Passport ────────────────────────────

class PassportTripSummary(BaseModel):
    id: str
    source: str
    destination: str
    distance_km: Optional[float]
    revenue: float
    status: str
    completed_at: Optional[datetime]


class PassportMaintenanceSummary(BaseModel):
    id: str
    service_type: str
    cost: float
    opened_at: datetime
    closed_at: Optional[datetime]
    status: str


class PassportFuelSummary(BaseModel):
    id: str
    liters: float
    cost: float
    date: date_type
    odometer_km: Optional[float]


class PassportExpenseSummary(BaseModel):
    id: str
    category: str
    amount: float
    date: date_type
    notes: Optional[str]


class ComplianceEvent(BaseModel):
    timestamp: datetime
    event: str
    status_before: str
    status_after: str


class PassportSummaryStats(BaseModel):
    total_trips: int
    total_revenue: float
    total_maintenance_cost: float
    total_fuel_cost: float
    total_expenses: float
    total_operational_cost: float
    average_fuel_efficiency_km_per_liter: Optional[float]


class VehiclePassportResponse(BaseModel):
    vehicle: VehicleResponse
    trip_history: List[PassportTripSummary]
    maintenance_history: List[PassportMaintenanceSummary]
    fuel_logs: List[PassportFuelSummary]
    expenses: List[PassportExpenseSummary]
    compliance_timeline: List[ComplianceEvent]
    summary: PassportSummaryStats


# ──────────────────────────── Predictive Maintenance ────────────────────────────

class ForecastItem(BaseModel):
    predicted_date: date_type
    service_type: str
    reason: str
    urgency: str
    estimated_cost: Optional[float] = None


class LastMaintenanceInfo(BaseModel):
    service_type: str
    closed_at: Optional[datetime]
    odometer_km: Optional[float]


class MaintenanceForecastResponse(BaseModel):
    vehicle_id: str
    next_maintenance: Optional[ForecastItem]
    upcoming_services: List[ForecastItem]
    last_maintenance: Optional[LastMaintenanceInfo]
