"""
TransitOps SQLAlchemy ORM models.

All 7 mandatory entities with enums, relationships, and constraints.
"""

import uuid
from datetime import datetime, date

from sqlalchemy import (
    String, Float, Integer, DateTime, Date, Text, ForeignKey, Enum, Boolean,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum

from app.database import Base


# ──────────────────────────── Enums ────────────────────────────

class UserRole(str, enum.Enum):
    fleet_manager = "fleet_manager"
    driver = "driver"
    safety_officer = "safety_officer"
    financial_analyst = "financial_analyst"


class VehicleStatus(str, enum.Enum):
    Available = "Available"
    On_Trip = "On Trip"
    In_Shop = "In Shop"
    Retired = "Retired"


class DriverStatus(str, enum.Enum):
    Available = "Available"
    On_Trip = "On Trip"
    Off_Duty = "Off Duty"
    Suspended = "Suspended"


class TripStatus(str, enum.Enum):
    Draft = "Draft"
    Dispatched = "Dispatched"
    Completed = "Completed"
    Cancelled = "Cancelled"


class MaintenanceStatus(str, enum.Enum):
    Open = "Open"
    Closed = "Closed"


class ExpenseCategory(str, enum.Enum):
    Toll = "Toll"
    Fine = "Fine"
    Parking = "Parking"
    Other = "Other"


# ──────────────────────────── Helpers ────────────────────────────

def _uuid() -> str:
    return str(uuid.uuid4())


# ──────────────────────────── Models ────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    trips_created: Mapped[list["Trip"]] = relationship(back_populates="creator")


class Vehicle(Base):
    __tablename__ = "vehicles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    registration_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    name_model: Mapped[str] = mapped_column(String(255), nullable=False)
    type: Mapped[str] = mapped_column(String(100), nullable=False)
    max_load_capacity_kg: Mapped[float] = mapped_column(Float, nullable=False)
    odometer_km: Mapped[float] = mapped_column(Float, default=0.0)
    acquisition_cost: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[VehicleStatus] = mapped_column(
        Enum(VehicleStatus), default=VehicleStatus.Available
    )
    region: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    trips: Mapped[list["Trip"]] = relationship(back_populates="vehicle")
    maintenance_logs: Mapped[list["MaintenanceLog"]] = relationship(back_populates="vehicle")
    fuel_logs: Mapped[list["FuelLog"]] = relationship(back_populates="vehicle")
    expenses: Mapped[list["Expense"]] = relationship(back_populates="vehicle")


class Driver(Base):
    __tablename__ = "drivers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    license_number: Mapped[str] = mapped_column(
        String(50), unique=True, nullable=False, index=True
    )
    license_category: Mapped[str] = mapped_column(String(50), nullable=False)
    license_expiry_date: Mapped[date] = mapped_column(Date, nullable=False)
    contact_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    safety_score: Mapped[float] = mapped_column(Float, default=100.0)
    status: Mapped[DriverStatus] = mapped_column(
        Enum(DriverStatus), default=DriverStatus.Available
    )
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    trips: Mapped[list["Trip"]] = relationship(back_populates="driver")


class Trip(Base):
    __tablename__ = "trips"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    destination: Mapped[str] = mapped_column(String(255), nullable=False)
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id"), nullable=False
    )
    driver_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("drivers.id"), nullable=False
    )
    cargo_weight_kg: Mapped[float] = mapped_column(Float, nullable=False)
    planned_distance_km: Mapped[float] = mapped_column(Float, nullable=False)
    actual_distance_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    fuel_consumed_liters: Mapped[float | None] = mapped_column(Float, nullable=True)
    revenue: Mapped[float] = mapped_column(Float, default=0.0)
    status: Mapped[TripStatus] = mapped_column(
        Enum(TripStatus), default=TripStatus.Draft
    )
    created_by: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id"), nullable=False
    )
    dispatched_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(back_populates="trips")
    driver: Mapped["Driver"] = relationship(back_populates="trips")
    creator: Mapped["User"] = relationship(back_populates="trips_created")
    fuel_logs: Mapped[list["FuelLog"]] = relationship(back_populates="trip")


class MaintenanceLog(Base):
    __tablename__ = "maintenance_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id"), nullable=False
    )
    service_type: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    cost: Mapped[float] = mapped_column(Float, default=0.0)
    odometer_at_service_km: Mapped[float | None] = mapped_column(Float, nullable=True)
    status: Mapped[MaintenanceStatus] = mapped_column(
        Enum(MaintenanceStatus), default=MaintenanceStatus.Open
    )
    opened_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(back_populates="maintenance_logs")


class FuelLog(Base):
    __tablename__ = "fuel_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id"), nullable=False
    )
    trip_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("trips.id"), nullable=True
    )
    liters: Mapped[float] = mapped_column(Float, nullable=False)
    cost: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    odometer_km: Mapped[float | None] = mapped_column(Float, nullable=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(back_populates="fuel_logs")
    trip: Mapped["Trip | None"] = relationship(back_populates="fuel_logs")


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    vehicle_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("vehicles.id"), nullable=False
    )
    category: Mapped[ExpenseCategory] = mapped_column(
        Enum(ExpenseCategory), nullable=False
    )
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    vehicle: Mapped["Vehicle"] = relationship(back_populates="expenses")
