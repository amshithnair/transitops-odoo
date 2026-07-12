// Demo/seed fallback data — mirrors the hackathon mockup values (VAN-05, TRUCK-11,
// MINI-03, drivers Alex/John/Priya/Suresh). Used to render every screen fully even
// before the backend is reachable, so the live demo matches the given spec visuals.

import type { Vehicle, Driver, Trip, Maintenance, FuelLog, Expense, KPIs, ReportData } from './types';

export const demoVehicles: Vehicle[] = [
  { id: 'v1', registration_number: 'VAN-05',   name_model: 'Force Traveller',  type: 'Van',   max_load_capacity_kg: 500,  odometer_km: 74000,  acquisition_cost: 620000,  status: 'Available', region: 'North' },
  { id: 'v2', registration_number: 'TRUCK-11', name_model: 'Tata LPT 1618',    type: 'Truck', max_load_capacity_kg: 5000, odometer_km: 182000, acquisition_cost: 2450000, status: 'On Trip',   region: 'West' },
  { id: 'v3', registration_number: 'MINI-03',  name_model: 'Mahindra Jeeto',   type: 'Mini',  max_load_capacity_kg: 1000, odometer_km: 66000,  acquisition_cost: 410000,  status: 'In Shop',   region: 'South' },
  { id: 'v4', registration_number: 'VAN-09',   name_model: 'Maruti Eeco',      type: 'Van',   max_load_capacity_kg: 750,  odometer_km: 249900, acquisition_cost: 590000,  status: 'Retired',   region: 'East' },
  { id: 'v5', registration_number: 'TRUCK-04', name_model: 'Ashok Leyland Dost', type: 'Truck', max_load_capacity_kg: 3000, odometer_km: 98500, acquisition_cost: 1850000, status: 'Available', region: 'West' },
  { id: 'v6', registration_number: 'MINI-08',  name_model: 'Tata Ace',         type: 'Mini',  max_load_capacity_kg: 750,  odometer_km: 41200,  acquisition_cost: 480000,  status: 'Available', region: 'North' },
];

export const demoDrivers: Driver[] = [
  { id: 'd1', name: 'Alex',   license_number: 'DL-88213', license_category: 'LMV', license_expiry: '2026-12-20', contact_number: '98765xxxxx', safety_score: 96, trip_completion_pct: 96, status: 'Available' },
  { id: 'd2', name: 'John',   license_number: 'DL-44120', license_category: 'HMV', license_expiry: '2025-03-15', contact_number: '98220xxxxx', safety_score: 62, trip_completion_pct: 81, status: 'Suspended' },
  { id: 'd3', name: 'Priya',  license_number: 'DL-77031', license_category: 'LMV', license_expiry: '2026-08-05', contact_number: '99801xxxxx', safety_score: 99, trip_completion_pct: 99, status: 'On Trip' },
  { id: 'd4', name: 'Suresh', license_number: 'DL-90045', license_category: 'HMV', license_expiry: '2027-01-28', contact_number: '99440xxxxx', safety_score: 88, trip_completion_pct: 88, status: 'Off Duty' },
];

export const demoTrips: Trip[] = [
  { id: 't1', code: 'TR001', source: 'Gandhinagar Depot', destination: 'Ahmedabad Hub',    vehicle_label: 'VAN-05',   driver_label: 'Alex',   cargo_weight_kg: 450, planned_distance_km: 32, status: 'Dispatched', eta: '45 min' },
  { id: 't2', code: 'TR002', source: 'Rajkot Yard',       destination: 'Surat Center',      vehicle_label: 'TRUCK-11', driver_label: 'John',   cargo_weight_kg: 4200, planned_distance_km: 245, status: 'Completed', eta: null, final_odometer: 182000, fuel_consumed: 110, revenue: 42000 },
  { id: 't3', code: 'TR003', source: 'Vadodara',          destination: 'Anand',             vehicle_label: 'MINI-03',  driver_label: 'Priya',  cargo_weight_kg: 800, planned_distance_km: 40, status: 'Dispatched', eta: '1h 10m' },
  { id: 't4', code: 'TR004', source: 'Vatva Industrial Area', destination: 'Sanand Warehouse', vehicle_label: null,   driver_label: 'Suresh', cargo_weight_kg: 0, planned_distance_km: 55, status: 'Draft', eta: null, note: 'Awaiting vehicle' },
  { id: 't6', code: 'TR006', source: 'Mansa',             destination: 'Kalol Depot',       vehicle_label: null,      driver_label: null,     cargo_weight_kg: 0, planned_distance_km: 28, status: 'Cancelled', eta: null, note: 'Vehicle went to shop' },
];

export const demoMaintenance: Maintenance[] = [
  { id: 'm1', vehicle_label: 'VAN-05',   service_type: 'Oil Change',   cost: 2500,  date: '2026-07-05', status: 'Active' },
  { id: 'm2', vehicle_label: 'TRUCK-11', service_type: 'Engine Repair', cost: 18000, date: '2026-06-28', status: 'Closed' },
  { id: 'm3', vehicle_label: 'MINI-03',  service_type: 'Tyre Replace',  cost: 6200,  date: '2026-07-08', status: 'Active' },
];

export const demoFuel: FuelLog[] = [
  { id: 'f1', vehicle_label: 'VAN-05',   date: '2026-07-06', liters: 42,  fuel_cost: 3150 },
  { id: 'f2', vehicle_label: 'TRUCK-11', date: '2026-07-06', liters: 110, fuel_cost: 8400 },
  { id: 'f3', vehicle_label: 'MINI-03',  date: '2026-07-06', liters: 28,  fuel_cost: 2080 },
];

export const demoExpenses: Expense[] = [
  { id: 'e1', trip_code: 'TR001', vehicle_label: 'VAN-05',   toll: 120, other_misc: 0,   maintenance_cost: 2500,  total: 5770 },
  { id: 'e2', trip_code: 'TR002', vehicle_label: 'TRUCK-11', toll: 340, other_misc: 150, maintenance_cost: 18000, total: 26890 },
];

export const demoKpis: KPIs = {
  total_vehicles: 68,
  total_drivers: 45,
  available_drivers: 19,
  active_vehicles: 53,
  available_vehicles: 42,
  vehicles_in_maintenance: 5,
  active_trips: 18,
  pending_trips: 9,
  drivers_on_duty: 26,
  fleet_utilization_pct: 81,
  total_fuel_cost: 125000,
  monthly_expense: 45000,
  average_mileage: 8.5,
  vehicle_status_breakdown: [
    { label: 'Available', value: 42, color: 'var(--green)' },
    { label: 'On Trip',   value: 18, color: 'var(--blue)' },
    { label: 'In Shop',   value: 5,  color: 'var(--amber)' },
    { label: 'Retired',   value: 3,  color: 'var(--red)' },
  ],
};

// Vehicle status breakdown for dashboard bars
export const demoStatusBreakdown = [
  { label: 'Available', value: 42, color: 'var(--green)' },
  { label: 'On Trip',   value: 18, color: 'var(--blue)' },
  { label: 'In Shop',   value: 5,  color: 'var(--amber)' },
  { label: 'Retired',   value: 3,  color: 'var(--red)' },
];

export const demoReport: ReportData = {
  fuel_efficiency_kmpl: 8.4,
  fleet_utilization_pct: 81,
  operational_cost: 34070,
  vehicle_roi_pct: 14.2,
  monthly_revenue: [
    { month: 'Jan', value: 42 }, { month: 'Feb', value: 38 }, { month: 'Mar', value: 51 },
    { month: 'Apr', value: 64 }, { month: 'May', value: 57 }, { month: 'Jun', value: 69 },
    { month: 'Jul', value: 66 },
  ],
  costliest_vehicles: [
    { label: 'TRUCK-11', value: 26890 },
    { label: 'MINI-03',  value: 8280 },
    { label: 'VAN-05',   value: 5770 },
  ],
};

export const TOTAL_OPERATIONAL_COST = 34070;
