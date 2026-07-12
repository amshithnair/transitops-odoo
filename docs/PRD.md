# Project Requirement Document (PRD) — TransitOps

## 1. Product Overview
TransitOps is a lean, core fleet operations platform built to manage vehicles, drivers, trips, maintenance logs, fuel, and expenses. It provides a FastAPI backend, a React + TypeScript frontend, and is orchestrated via Docker Compose.

---

## 2. Core Functional Requirements

### 2.1 Authentication & Authorization
- **JWT Authentication:** Email and password login generating a JWT token. All API endpoints (except `/auth/login` and `/auth/register`) require a valid JWT token.
- **Role-Based Access Control (RBAC):** Efficently enforced server-side.
  - **fleet_manager:** Full CRUD on vehicles, drivers, trip lifecycle (including dispatch), maintenance management, and report viewing.
  - **driver:** Create trips, view/update own trips, and log fuel.
  - **safety_officer:** Read-only access on vehicles/trips, full CRUD on driver compliance (license expiry, safety score), and report viewing.
  - **financial_analyst:** Read-only access to most entities, write access for fuel and expenses logs, and full report access.

### 2.2 Dashboard
- **KPI Endpoint:** Returns Active Vehicles, Available Vehicles, Vehicles in Maintenance, Active Trips, Pending Trips, Drivers On Duty, and Fleet Utilization (%).
- **Filters:** Support filtering by vehicle type, status, and region.

### 2.3 Vehicle Registry (CRUD)
- Vehicle entities include registration number (unique), name/model, type, max load capacity, odometer, acquisition cost, status, and region.

### 2.4 Driver Management (CRUD)
- Driver entities include name, license number (unique), license category, license expiry date, contact number, safety score, and status.

### 2.5 Trip Management
- **Fields:** Source, destination, vehicle, driver, cargo weight, planned distance, actual distance, fuel consumed, revenue, status, created by, and timestamps.
- **Transitions:** Hardcoded workflow transitions via explicit endpoints:
  - `POST /trips/{id}/dispatch` (Draft → Dispatched)
  - `POST /trips/{id}/complete` (Dispatched → Completed)
  - `POST /trips/{id}/cancel` (Draft/Dispatched → Cancelled)

### 2.6 Maintenance Logs
- Create and manage maintenance records.
- Opening a maintenance record sets the vehicle to `In Shop` (removing it from dispatch pools).
- Closing a maintenance record restores the vehicle to `Available` (unless `Retired`).

### 2.7 Fuel & Expense Management
- Log fuel purchases (liters, cost, date) and operational expenses (category: Toll, Fine, Parking, Other; amount, date).
- Calculate total operational cost per vehicle (Fuel + Maintenance + Expenses).

### 2.8 Reports & Analytics
- **Fuel Efficiency:** Distance / Fuel (per vehicle, aggregated from FuelLog).
- **Fleet Utilization:** Vehicles On Trip / Total Active Vehicles.
- **Operational Cost:** Fuel + Maintenance + Expenses.
- **Vehicle ROI:** (Revenue - Costs) / Acquisition Cost.
- **CSV Export:** Download CSV spreadsheets for all reports.

---

## 3. Explicit Non-Goals
The following features are explicitly out of scope:
- AI Dispatch/Route Optimization
- Predictive Maintenance
- Interactive Fleet Map
- Digital Vehicle Passport
- Email/SMS Notifications
- PDF Export
- Document Management
- Dark Mode / UI Customization
