# API Reference Summary

This document is a human-readable summary of the endpoints defined in [openapi.json](file:///c:/Users/Amshith%20Nair/transitops-odoo/transitops-odoo/docs/openapi.json). The interactive docs are also available at `/docs` (Swagger UI) and `/redoc` (ReDoc) on a running backend server.

---

## 1. Auth Module (`/auth`)

| Method | Path | Auth Role Required | Request Body | Response Shape | Error Responses |
|---|---|---|---|---|---|
| `POST` | `/auth/register` | None (Public) | `UserRegister` | `UserResponse` | `409 Conflict` (Email exists) |
| `POST` | `/auth/login` | None (Public) | `UserLogin` | `Token` (JWT) | `401 Unauthorized` |
| `GET` | `/auth/me` | Authenticated (Any Role) | None | `UserResponse` | `401 Unauthorized` |

---

## 2. Vehicles Module (`/vehicles`)

| Method | Path | Auth Role Required | Request Body | Response Shape | Error Responses |
|---|---|---|---|---|---|
| `GET` | `/vehicles` | Authenticated (Any Role) | None (Query: `type`, `status`, `region`) | `list[VehicleResponse]` | `401 Unauthorized` |
| `GET` | `/vehicles/{vehicle_id}` | Authenticated (Any Role) | None | `VehicleResponse` | `401 Unauthorized`, `404 Not Found` |
| `POST` | `/vehicles` | `fleet_manager` | `VehicleCreate` | `VehicleResponse` | `400 Bad Request`, `401 Unauth`, `403 Forbidden`, `409 Conflict` (Rule 1) |
| `PUT` | `/vehicles/{vehicle_id}` | `fleet_manager` | `VehicleUpdate` | `VehicleResponse` | `400 Bad Request`, `401 Unauth`, `403 Forbidden`, `404 Not Found`, `409 Conflict` |
| `DELETE` | `/vehicles/{vehicle_id}` | `fleet_manager` | None | `204 No Content` | `401 Unauth`, `403 Forbidden`, `404 Not Found` |

---

## 3. Drivers Module (`/drivers`)

| Method | Path | Auth Role Required | Request Body | Response Shape | Error Responses |
|---|---|---|---|---|---|
| `GET` | `/drivers` | Authenticated (Any Role) | None | `list[DriverResponse]` | `401 Unauthorized` |
| `GET` | `/drivers/{driver_id}` | Authenticated (Any Role) | None | `DriverResponse` | `401 Unauthorized`, `404 Not Found` |
| `POST` | `/drivers` | `fleet_manager` | `DriverCreate` | `DriverResponse` | `400 Bad Request`, `401 Unauth`, `403 Forbidden`, `409 Conflict` |
| `PUT` | `/drivers/{driver_id}` | `fleet_manager` OR `safety_officer` | `DriverUpdate` | `DriverResponse` | `400 Bad Request`, `401 Unauth`, `403 Forbidden` (non-compliance fields for safety_officer), `404 Not Found`, `409 Conflict` |
| `DELETE` | `/drivers/{driver_id}` | `fleet_manager` | None | `204 No Content` | `401 Unauth`, `403 Forbidden`, `404 Not Found` |

---

## 4. Trips Module (`/trips`)

| Method | Path | Auth Role Required | Request Body | Response Shape | Error Responses |
|---|---|---|---|---|---|
| `GET` | `/trips` | Authenticated (Drivers see own, others see all) | None | `list[TripResponse]` | `401 Unauthorized` |
| `GET` | `/trips/{trip_id}` | Authenticated (Any Role) | None | `TripResponse` | `401 Unauthorized`, `404 Not Found` |
| `POST` | `/trips` | `fleet_manager`, `driver` | `TripCreate` | `TripResponse` | `400 Bad Request` (Rules 2-5), `401 Unauth`, `403 Forbidden`, `404 Not Found` |
| `POST` | `/trips/{trip_id}/dispatch` | `fleet_manager` | None | `TripResponse` | `400 Bad Request` (Rules 2-4), `401 Unauth`, `403 Forbidden`, `404 Not Found`, `409 Conflict` (not Draft) |
| `POST` | `/trips/{trip_id}/complete` | `fleet_manager`, `driver` | `TripComplete` | `TripResponse` | `401 Unauth`, `403 Forbidden`, `404 Not Found`, `409 Conflict` (not Dispatched) |
| `POST` | `/trips/{trip_id}/cancel` | `fleet_manager` | None | `TripResponse` | `401 Unauth`, `403 Forbidden`, `404 Not Found`, `409 Conflict` (completed/cancelled) |

---

## 5. Maintenance Module (`/maintenance`)

| Method | Path | Auth Role Required | Request Body | Response Shape | Error Responses |
|---|---|---|---|---|---|
| `GET` | `/maintenance` | Authenticated (Any Role) | None | `list[MaintenanceResponse]` | `401 Unauthorized` |
| `GET` | `/maintenance/{log_id}` | Authenticated (Any Role) | None | `MaintenanceResponse` | `401 Unauthorized`, `404 Not Found` |
| `POST` | `/maintenance` | `fleet_manager` | `MaintenanceCreate` | `MaintenanceResponse` | `400 Bad Request`, `401 Unauth`, `403 Forbidden`, `404 Not Found` (sets vehicle status to In Shop via Rule 9) |
| `POST` | `/maintenance/{log_id}/close` | `fleet_manager` | `MaintenanceClose` | `MaintenanceResponse` | `401 Unauth`, `403 Forbidden`, `404 Not Found`, `409 Conflict` (restores status via Rule 10) |

---

## 6. Fuel & Expense Module (`/fuel-expense`)

| Method | Path | Auth Role Required | Request Body | Response Shape | Error Responses |
|---|---|---|---|---|---|
| `GET` | `/fuel-expense/fuel` | Authenticated (Any Role) | None (Query: `vehicle_id`) | `list[FuelLogResponse]` | `401 Unauthorized` |
| `POST` | `/fuel-expense/fuel` | `fleet_manager`, `driver`, `financial_analyst` | `FuelLogCreate` | `FuelLogResponse` | `401 Unauth`, `403 Forbidden`, `404 Not Found` |
| `GET` | `/fuel-expense/expenses` | Authenticated (Any Role) | None (Query: `vehicle_id`) | `list[ExpenseResponse]` | `401 Unauthorized` |
| `POST` | `/fuel-expense/expenses` | `fleet_manager`, `financial_analyst` | `ExpenseCreate` | `ExpenseResponse` | `401 Unauth`, `403 Forbidden`, `404 Not Found` |
| `GET` | `/fuel-expense/operational-cost/{vehicle_id}` | Authenticated (Any Role) | None | `{vehicle_id: str, ...}` | `401 Unauth`, `404 Not Found` |

---

## 7. Dashboard Module (`/dashboard`)

| Method | Path | Auth Role Required | Request Body | Response Shape | Error Responses |
|---|---|---|---|---|---|
| `GET` | `/dashboard/kpis` | Authenticated (Any Role) | None (Query: `vehicle_type`, `status`, `region`) | `DashboardKPIs` | `401 Unauthorized` |

---

## 8. Reports Module (`/reports`)

| Method | Path | Auth Role Required | Request Body | Response Shape | Error Responses |
|---|---|---|---|---|---|
| `GET` | `/reports/fuel-efficiency` | `fleet_manager`, `safety_officer`, `financial_analyst` | None | `list[FuelEfficiencyReport]` | `401 Unauth`, `403 Forbidden` |
| `GET` | `/reports/fuel-efficiency/csv` | `fleet_manager`, `safety_officer`, `financial_analyst` | None | CSV Streaming | `401 Unauth`, `403 Forbidden` |
| `GET` | `/reports/fleet-utilization` | `fleet_manager`, `safety_officer`, `financial_analyst` | None | `FleetUtilizationReport` | `401 Unauth`, `403 Forbidden` |
| `GET` | `/reports/fleet-utilization/csv` | `fleet_manager`, `safety_officer`, `financial_analyst` | None | CSV Streaming | `401 Unauth`, `403 Forbidden` |
| `GET` | `/reports/operational-cost` | `fleet_manager`, `safety_officer`, `financial_analyst` | None | `list[OperationalCostReport]` | `401 Unauth`, `403 Forbidden` |
| `GET` | `/reports/operational-cost/csv` | `fleet_manager`, `safety_officer`, `financial_analyst` | None | CSV Streaming | `401 Unauth`, `403 Forbidden` |
| `GET` | `/reports/vehicle-roi` | `fleet_manager`, `safety_officer`, `financial_analyst` | None | `list[VehicleROIReport]` | `401 Unauth`, `403 Forbidden` |
| `GET` | `/reports/vehicle-roi/csv` | `fleet_manager`, `safety_officer`, `financial_analyst` | None | CSV Streaming | `401 Unauth`, `403 Forbidden` |
