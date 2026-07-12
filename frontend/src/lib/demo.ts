// Demo/seed fallback data — reduced dataset for TransitOps demo fleet.
// Compact and clean, but still varied enough for all filters to function.

import type { Vehicle, Driver, Trip, Maintenance, FuelLog, Expense, KPIs, ReportData } from './types';

export const demoVehicles: Vehicle[] = [
  { id: 'v01', registration_number: 'GJ-01-T-4421', name_model: 'Tata LPT 1618',       type: 'Truck', max_load_capacity_kg: 8000,  odometer_km: 182400, acquisition_cost: 2850000, status: 'On Trip',   region: 'West'  },
  { id: 'v02', registration_number: 'GJ-05-V-0873', name_model: 'Force Traveller 26',   type: 'Van',   max_load_capacity_kg: 1200,  odometer_km: 74100,  acquisition_cost: 720000,  status: 'Available', region: 'North' },
  { id: 'v03', registration_number: 'GJ-18-M-3301', name_model: 'Mahindra Jeeto Plus',  type: 'Mini',  max_load_capacity_kg: 750,   odometer_km: 66200,  acquisition_cost: 430000,  status: 'In Shop',   region: 'South' },
  { id: 'v04', registration_number: 'RJ-14-T-7781', name_model: 'Ashok Leyland Dost+',  type: 'Truck', max_load_capacity_kg: 3500,  odometer_km: 99200,  acquisition_cost: 1950000, status: 'Available', region: 'West'  },
  { id: 'v05', registration_number: 'MH-12-V-5529', name_model: 'Maruti Eeco Cargo',    type: 'Van',   max_load_capacity_kg: 800,   odometer_km: 251000, acquisition_cost: 610000,  status: 'Retired',   region: 'East'  },
  { id: 'v06', registration_number: 'GJ-01-M-8820', name_model: 'Tata Ace Gold',        type: 'Mini',  max_load_capacity_kg: 1000,  odometer_km: 41600,  acquisition_cost: 510000,  status: 'Available', region: 'North' },
  { id: 'v07', registration_number: 'GJ-06-T-2218', name_model: 'Eicher Pro 3015',      type: 'Truck', max_load_capacity_kg: 6000,  odometer_km: 139800, acquisition_cost: 2200000, status: 'On Trip',   region: 'East'  },
  { id: 'v08', registration_number: 'MP-09-V-1144', name_model: 'Bajaj Maxima Cargo',   type: 'Van',   max_load_capacity_kg: 550,   odometer_km: 28900,  acquisition_cost: 290000,  status: 'Available', region: 'Central'}
];

export const demoDrivers: Driver[] = [
  { id: 'dr01', name: 'Arjun Mehta',      license_number: 'GJ-01-2018-0088213', license_category: 'HMV', license_expiry: '2027-04-10', contact_number: '98765-43210', safety_score: 96, trip_completion_pct: 97, status: 'On Trip'   },
  { id: 'dr02', name: 'Priya Sharma',     license_number: 'GJ-05-2019-0077031', license_category: 'LMV', license_expiry: '2028-08-05', contact_number: '99801-12345', safety_score: 99, trip_completion_pct: 99, status: 'Available' },
  { id: 'dr03', name: 'Suresh Patel',     license_number: 'GJ-18-2016-0090045', license_category: 'HMV', license_expiry: '2026-11-28', contact_number: '99440-67890', safety_score: 88, trip_completion_pct: 91, status: 'Available' },
  { id: 'dr04', name: 'Ravi Kumar',       license_number: 'RJ-14-2020-0044120', license_category: 'HMV', license_expiry: '2025-03-15', contact_number: '98220-11223', safety_score: 62, trip_completion_pct: 78, status: 'Suspended' },
  { id: 'dr05', name: 'Kavita Reddy',     license_number: 'MH-12-2021-0033900', license_category: 'LMV', license_expiry: '2028-06-20', contact_number: '97890-45678', safety_score: 94, trip_completion_pct: 95, status: 'Off Duty'  },
  { id: 'dr06', name: 'Dinesh Bhat',      license_number: 'KA-03-2017-0028811', license_category: 'HMV', license_expiry: '2026-09-01', contact_number: '96600-33445', safety_score: 79, trip_completion_pct: 84, status: 'On Trip'   }
];

export const demoTrips: Trip[] = [
  { id: 't01', code: 'TR-2026-001', source: 'Gandhinagar Depot',      destination: 'Ahmedabad Hub',         vehicle_label: 'GJ-01-T-4421', driver_label: 'Arjun Mehta',   cargo_weight_kg: 4200,  planned_distance_km: 32,  status: 'Dispatched', eta: '40 min' },
  { id: 't02', code: 'TR-2026-002', source: 'Rajkot Yard',            destination: 'Surat Logistics Center', vehicle_label: 'GJ-06-T-2218', driver_label: 'Dinesh Bhat',   cargo_weight_kg: 5600,  planned_distance_km: 248, status: 'Dispatched', eta: '4h 15m' },
  { id: 't04', code: 'TR-2026-004', source: 'Vatva Industrial Area',   destination: 'Sanand SEZ',             vehicle_label: null,           driver_label: 'Suresh Patel', cargo_weight_kg: 0,     planned_distance_km: 55,  status: 'Draft', eta: null, note: 'Awaiting vehicle assignment' },
  { id: 't05', code: 'TR-2026-005', source: 'Ahmedabad Hub',          destination: 'Bharuch Depot',          vehicle_label: 'RJ-14-T-7781', driver_label: 'Priya Sharma', cargo_weight_kg: 2800,  planned_distance_km: 185, status: 'Completed', eta: null, final_odometer: 99200, fuel_consumed: 65, revenue: 38500 },
  { id: 't07', code: 'TR-2026-007', source: 'Pune Hub',               destination: 'Nashik Depot',           vehicle_label: null,           driver_label: null,           cargo_weight_kg: 0,     planned_distance_km: 212, status: 'Cancelled', eta: null, note: 'Customer order cancelled' }
];

export const demoMaintenance: Maintenance[] = [
  { id: 'm01', vehicle_label: 'GJ-01-T-4421', service_type: 'Engine Overhaul',   cost: 42000, date: '2026-07-08', status: 'Active' },
  { id: 'm02', vehicle_label: 'GJ-18-M-3301', service_type: 'Tyre Replacement',  cost: 8400,  date: '2026-07-09', status: 'Active' },
  { id: 'm04', vehicle_label: 'GJ-06-T-2218', service_type: 'Oil & Filter Change', cost: 3200, date: '2026-07-01', status: 'Closed' }
];

export const demoFuel: FuelLog[] = [
  { id: 'f01', vehicle_label: 'GJ-01-T-4421', date: '2026-07-10', liters: 120, fuel_cost: 9600 },
  { id: 'f02', vehicle_label: 'GJ-06-T-2218', date: '2026-07-10', liters: 135, fuel_cost: 10800 },
  { id: 'f03', vehicle_label: 'GJ-05-V-0873', date: '2026-07-09', liters: 45,  fuel_cost: 3600 }
];

export const demoExpenses: Expense[] = [
  { id: 'e01', trip_code: 'TR-2026-001', vehicle_label: 'GJ-01-T-4421', toll: 280,  other_misc: 120, maintenance_cost: 42000, total: 42400 },
  { id: 'e02', trip_code: 'TR-2026-002', vehicle_label: 'GJ-06-T-2218', toll: 640,  other_misc: 200, maintenance_cost: 3200,  total: 4040 }
];

export const demoKpis: KPIs = {
  active_vehicles: 8,
  available_vehicles: 4,
  vehicles_in_maintenance: 2,
  active_trips: 2,
  pending_trips: 1,
  drivers_on_duty: 4,
  fleet_utilization_pct: 50,
};

export const demoStatusBreakdown = [
  { label: 'Available', value: 4,  color: 'var(--green)' },
  { label: 'On Trip',   value: 2,  color: 'var(--blue)'  },
  { label: 'In Shop',   value: 1,  color: 'var(--amber)' },
  { label: 'Retired',   value: 1,  color: 'var(--red)'   },
];

export const demoReport: ReportData = {
  fuel_efficiency_kmpl: 8.1,
  fleet_utilization_pct: 50,
  operational_cost: 46440,
  vehicle_roi_pct: 12.8,
  monthly_revenue: [
    { month: 'Jan', value: 28 }, { month: 'Feb', value: 32 }, { month: 'Mar', value: 41 },
    { month: 'Apr', value: 38 }, { month: 'May', value: 45 }, { month: 'Jun', value: 50 },
    { month: 'Jul', value: 58 },
  ],
  costliest_vehicles: [
    { label: 'GJ-01-T-4421', value: 42400 },
    { label: 'GJ-06-T-2218', value: 4040 }
  ],
};

export const TOTAL_OPERATIONAL_COST = 46440;
