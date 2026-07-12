// Demo/seed fallback data — used when backend is unreachable so screens still render.
// Updated to match new schema fields.

import type { Vehicle, Driver, Trip, Maintenance, FuelLog, Expense, KPIs, ReportData } from './types';

export const demoVehicles: Vehicle[] = [
  { id: 'v1', registration_number: 'VAN-05', name_model: 'Ford Transit 2024', type: 'Van', max_load_capacity_kg: 2500, odometer_km: 15000, acquisition_cost: 45000, status: 'Available', region: 'North', manufacturer: 'Ford', fuel_type: 'Diesel', purchase_date: '2024-01-15', insurance_expiry: '2027-01-15', fitness_expiry: '2027-06-30', puc_expiry: '2026-12-31' },
  { id: 'v2', registration_number: 'TRK-12', name_model: 'Volvo FH16', type: 'Truck', max_load_capacity_kg: 18000, odometer_km: 85000, acquisition_cost: 120000, status: 'On Trip', region: 'South', manufacturer: 'Volvo', fuel_type: 'Diesel' },
  { id: 'v3', registration_number: 'VAN-03', name_model: 'Mercedes Sprinter', type: 'Van', max_load_capacity_kg: 2000, odometer_km: 42000, acquisition_cost: 38000, status: 'In Shop', region: 'East', manufacturer: 'Mercedes-Benz', fuel_type: 'Diesel' },
  { id: 'v4', registration_number: 'MINI-07', name_model: 'Tata Ace Gold', type: 'Mini', max_load_capacity_kg: 750, odometer_km: 28000, acquisition_cost: 18000, status: 'Available', region: 'West', manufacturer: 'Tata', fuel_type: 'Petrol' },
];

export const demoDrivers: Driver[] = [
  { id: 'd1', name: 'Alex Johnson', license_number: 'DL-2024-0042', license_category: 'C', license_expiry_date: '2027-12-31', contact_number: '+1-555-0142', email: 'alex@transitops.com', experience_years: 8, safety_score: 95, status: 'Available' },
  { id: 'd2', name: 'Maria Garcia', license_number: 'DL-2024-0078', license_category: 'C+E', license_expiry_date: '2027-06-15', contact_number: '+1-555-0178', email: 'maria@transitops.com', experience_years: 12, safety_score: 98, status: 'Available' },
  { id: 'd3', name: 'James Chen', license_number: 'DL-2023-0091', license_category: 'B', license_expiry_date: '2026-03-01', contact_number: '+1-555-0191', email: 'james@transitops.com', experience_years: 3, safety_score: 88, status: 'Off Duty' },
];

export const demoTrips: Trip[] = [
  { id: 't1', code: 'TR001', source: 'Gandhinagar Depot', destination: 'Ahmedabad Hub', vehicle_label: 'VAN-05', driver_label: 'Alex', cargo_weight_kg: 450, planned_distance_km: 32, status: 'Dispatched', eta: '45 min' },
  { id: 't2', code: 'TR002', source: 'Rajkot Yard', destination: 'Surat Center', vehicle_label: 'TRK-12', driver_label: 'Maria', cargo_weight_kg: 4200, planned_distance_km: 245, status: 'Completed', eta: null },
  { id: 't3', code: 'TR003', source: 'Vadodara', destination: 'Anand', vehicle_label: 'VAN-03', driver_label: 'Priya', cargo_weight_kg: 800, planned_distance_km: 40, status: 'Draft', eta: null },
];

export const demoMaintenance: Maintenance[] = [
  { id: 'm1', vehicle_label: 'VAN-05', service_type: 'Oil Change', cost: 2500, date: '2026-07-05', status: 'Active' },
  { id: 'm2', vehicle_label: 'TRK-12', service_type: 'Engine Repair', cost: 18000, date: '2026-06-28', status: 'Closed' },
];

export const demoFuel: FuelLog[] = [
  { id: 'f1', vehicle_id: 'v1', liters: 45, cost: 3375, date: '2026-07-01', vehicle_registration: 'VAN-05' },
  { id: 'f2', vehicle_id: 'v2', liters: 120, cost: 9600, date: '2026-07-03', vehicle_registration: 'TRK-12' },
  { id: 'f3', vehicle_id: 'v3', liters: 38, cost: 2850, date: '2026-06-28', vehicle_registration: 'VAN-03' },
];

export const demoExpenses: Expense[] = [
  { id: 'e1', vehicle_id: 'v1', category: 'Toll', amount: 350, date: '2026-07-02', description: 'Highway toll NH-48', vehicle_registration: 'VAN-05' },
  { id: 'e2', vehicle_id: 'v2', category: 'Parking', amount: 200, date: '2026-07-04', description: 'Warehouse parking', vehicle_registration: 'TRK-12' },
];

export const demoKpis: KPIs = {
  total_vehicles: 6,
  active_vehicles: 5,
  available_vehicles: 4,
  vehicles_in_maintenance: 1,
  total_drivers: 4,
  available_drivers: 2,
  active_trips: 1,
  pending_trips: 1,
  drivers_on_duty: 1,
  fleet_utilization_pct: 20,
  total_fuel_cost: 15825,
  monthly_expense: 5525,
  average_mileage: 8.4,
  vehicle_status_breakdown: [
    { label: 'Available', value: 4, color: 'var(--green)' },
    { label: 'On Trip', value: 1, color: 'var(--blue)' },
    { label: 'In Shop', value: 1, color: 'var(--amber)' },
  ],
};

export const demoStatusBreakdown = [
  { label: 'Available', value: 4, color: 'var(--green)' },
  { label: 'On Trip', value: 1, color: 'var(--blue)' },
  { label: 'In Shop', value: 1, color: 'var(--amber)' },
];

export const demoReport: ReportData = {
  fuel_efficiency_kmpl: 8.4,
  fleet_utilization_pct: 20,
  operational_cost: 16375,
  vehicle_roi_pct: null,
  monthly_revenue: [
    { month: 'Jan', value: 42 }, { month: 'Feb', value: 38 }, { month: 'Mar', value: 51 },
    { month: 'Apr', value: 64 }, { month: 'May', value: 57 }, { month: 'Jun', value: 69 },
    { month: 'Jul', value: 66 },
  ],
  costliest_vehicles: [
    { label: 'TRK-12', value: 9800 },
    { label: 'VAN-05', value: 3725 },
    { label: 'VAN-03', value: 2850 },
  ],
};
