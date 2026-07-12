// Demo/seed fallback data — rich realistic dataset for the TransitOps demo fleet.
// Designed so every filter (status, type, region, date, category, etc.) returns
// meaningful, varied results. Used when the backend is offline.

import type { Vehicle, Driver, Trip, Maintenance, FuelLog, Expense, KPIs, ReportData } from './types';

export const demoVehicles: Vehicle[] = [
  { id: 'v01', registration_number: 'GJ-01-T-4421', name_model: 'Tata LPT 1618',       type: 'Truck', max_load_capacity_kg: 8000,  odometer_km: 182400, acquisition_cost: 2850000, status: 'On Trip',   region: 'West'  },
  { id: 'v02', registration_number: 'GJ-05-V-0873', name_model: 'Force Traveller 26',   type: 'Van',   max_load_capacity_kg: 1200,  odometer_km: 74100,  acquisition_cost: 720000,  status: 'Available', region: 'North' },
  { id: 'v03', registration_number: 'GJ-18-M-3301', name_model: 'Mahindra Jeeto Plus',  type: 'Mini',  max_load_capacity_kg: 750,   odometer_km: 66200,  acquisition_cost: 430000,  status: 'In Shop',   region: 'South' },
  { id: 'v04', registration_number: 'RJ-14-T-7781', name_model: 'Ashok Leyland Dost+',  type: 'Truck', max_load_capacity_kg: 3500,  odometer_km: 99200,  acquisition_cost: 1950000, status: 'Available', region: 'West'  },
  { id: 'v05', registration_number: 'MH-12-V-5529', name_model: 'Maruti Eeco Cargo',    type: 'Van',   max_load_capacity_kg: 800,   odometer_km: 251000, acquisition_cost: 610000,  status: 'Retired',   region: 'East'  },
  { id: 'v06', registration_number: 'GJ-01-M-8820', name_model: 'Tata Ace Gold',        type: 'Mini',  max_load_capacity_kg: 1000,  odometer_km: 41600,  acquisition_cost: 510000,  status: 'Available', region: 'North' },
  { id: 'v07', registration_number: 'GJ-06-T-2218', name_model: 'Eicher Pro 3015',      type: 'Truck', max_load_capacity_kg: 6000,  odometer_km: 139800, acquisition_cost: 2200000, status: 'On Trip',   region: 'East'  },
  { id: 'v08', registration_number: 'MP-09-V-1144', name_model: 'Bajaj Maxima Cargo',   type: 'Van',   max_load_capacity_kg: 550,   odometer_km: 28900,  acquisition_cost: 290000,  status: 'Available', region: 'Central'},
  { id: 'v09', registration_number: 'GJ-23-T-9003', name_model: 'Tata Ultra 1012',      type: 'Truck', max_load_capacity_kg: 10000, odometer_km: 310500, acquisition_cost: 3200000, status: 'In Shop',   region: 'North' },
  { id: 'v10', registration_number: 'DL-1C-M-4411', name_model: 'Piaggio Ape Xtra LDX', type: 'Mini',  max_load_capacity_kg: 700,   odometer_km: 19200,  acquisition_cost: 380000,  status: 'Available', region: 'Central'},
  { id: 'v11', registration_number: 'GJ-04-T-0055', name_model: 'BharatBenz 1015R',     type: 'Truck', max_load_capacity_kg: 7000,  odometer_km: 215000, acquisition_cost: 2650000, status: 'Available', region: 'South' },
  { id: 'v12', registration_number: 'GJ-01-V-3398', name_model: 'Force Motors Kargo King', type: 'Van', max_load_capacity_kg: 1500, odometer_km: 87300,  acquisition_cost: 840000,  status: 'On Trip',   region: 'West'  },
  { id: 'v13', registration_number: 'UP-32-T-6612', name_model: 'Mahindra Bolero Pik-Up', type: 'Truck', max_load_capacity_kg: 2000,odometer_km: 61500,  acquisition_cost: 1400000, status: 'Available', region: 'East'  },
  { id: 'v14', registration_number: 'GJ-02-M-7700', name_model: 'Atul Shakti Cargo',    type: 'Mini',  max_load_capacity_kg: 600,   odometer_km: 33100,  acquisition_cost: 260000,  status: 'On Trip',   region: 'South' },
  { id: 'v15', registration_number: 'KA-03-T-8812', name_model: 'Tata LPT 3118',        type: 'Truck', max_load_capacity_kg: 14000, odometer_km: 428000, acquisition_cost: 4100000, status: 'Retired',   region: 'South' },
];

export const demoDrivers: Driver[] = [
  { id: 'dr01', name: 'Arjun Mehta',      license_number: 'GJ-01-2018-0088213', license_category: 'HMV', license_expiry: '2027-04-10', contact_number: '98765-43210', safety_score: 96, trip_completion_pct: 97, status: 'On Trip'   },
  { id: 'dr02', name: 'Priya Sharma',     license_number: 'GJ-05-2019-0077031', license_category: 'LMV', license_expiry: '2028-08-05', contact_number: '99801-12345', safety_score: 99, trip_completion_pct: 99, status: 'Available' },
  { id: 'dr03', name: 'Suresh Patel',     license_number: 'GJ-18-2016-0090045', license_category: 'HMV', license_expiry: '2026-11-28', contact_number: '99440-67890', safety_score: 88, trip_completion_pct: 91, status: 'Available' },
  { id: 'dr04', name: 'Ravi Kumar',       license_number: 'RJ-14-2020-0044120', license_category: 'HMV', license_expiry: '2025-03-15', contact_number: '98220-11223', safety_score: 62, trip_completion_pct: 78, status: 'Suspended' },
  { id: 'dr05', name: 'Kavita Reddy',     license_number: 'MH-12-2021-0033900', license_category: 'LMV', license_expiry: '2028-06-20', contact_number: '97890-45678', safety_score: 94, trip_completion_pct: 95, status: 'Off Duty'  },
  { id: 'dr06', name: 'Dinesh Bhat',      license_number: 'KA-03-2017-0028811', license_category: 'HMV', license_expiry: '2026-09-01', contact_number: '96600-33445', safety_score: 79, trip_completion_pct: 84, status: 'On Trip'   },
  { id: 'dr07', name: 'Neha Joshi',       license_number: 'GJ-06-2022-0011402', license_category: 'LMV', license_expiry: '2029-02-14', contact_number: '99120-78900', safety_score: 100, trip_completion_pct: 100, status: 'Available' },
  { id: 'dr08', name: 'Vikram Singh',     license_number: 'DL-01-2015-0056234', license_category: 'MGV', license_expiry: '2024-12-30', contact_number: '98100-22334', safety_score: 55, trip_completion_pct: 69, status: 'Suspended' },
  { id: 'dr09', name: 'Anita Desai',      license_number: 'GJ-23-2019-0099123', license_category: 'LMV', license_expiry: '2027-07-22', contact_number: '98440-55667', safety_score: 91, trip_completion_pct: 93, status: 'Off Duty'  },
  { id: 'dr10', name: 'Manoj Tiwari',     license_number: 'UP-32-2018-0071199', license_category: 'HMV', license_expiry: '2027-05-30', contact_number: '99901-88770', safety_score: 85, trip_completion_pct: 89, status: 'Available' },
  { id: 'dr11', name: 'Sonal Trivedi',    license_number: 'GJ-04-2020-0043300', license_category: 'LMV', license_expiry: '2028-10-11', contact_number: '97800-66123', safety_score: 97, trip_completion_pct: 98, status: 'On Trip'   },
  { id: 'dr12', name: 'Ramesh Nair',      license_number: 'GJ-02-2016-0062200', license_category: 'MGV', license_expiry: '2026-04-05', contact_number: '99011-34890', safety_score: 73, trip_completion_pct: 80, status: 'Available' },
];

export const demoTrips: Trip[] = [
  { id: 't01', code: 'TR-2026-001', source: 'Gandhinagar Depot',      destination: 'Ahmedabad Hub',         vehicle_label: 'GJ-01-T-4421', driver_label: 'Arjun Mehta',   cargo_weight_kg: 4200,  planned_distance_km: 32,  status: 'Dispatched', eta: '40 min' },
  { id: 't02', code: 'TR-2026-002', source: 'Rajkot Yard',            destination: 'Surat Logistics Center', vehicle_label: 'GJ-06-T-2218', driver_label: 'Dinesh Bhat',   cargo_weight_kg: 5600,  planned_distance_km: 248, status: 'Dispatched', eta: '4h 15m' },
  { id: 't03', code: 'TR-2026-003', source: 'Vadodara Central',       destination: 'Anand Warehouse',        vehicle_label: 'GJ-01-V-3398', driver_label: 'Sonal Trivedi', cargo_weight_kg: 900,   planned_distance_km: 42,  status: 'Dispatched', eta: '55 min' },
  { id: 't04', code: 'TR-2026-004', source: 'Vatva Industrial Area',   destination: 'Sanand SEZ',             vehicle_label: null,           driver_label: 'Suresh Patel', cargo_weight_kg: 0,     planned_distance_km: 55,  status: 'Draft', eta: null, note: 'Awaiting vehicle assignment' },
  { id: 't05', code: 'TR-2026-005', source: 'Ahmedabad Hub',          destination: 'Bharuch Depot',          vehicle_label: 'RJ-14-T-7781', driver_label: 'Manoj Tiwari', cargo_weight_kg: 2800,  planned_distance_km: 185, status: 'Completed', eta: null, final_odometer: 99200, fuel_consumed: 65, revenue: 38500 },
  { id: 't06', code: 'TR-2026-006', source: 'Surat Center',           destination: 'Vapi Yard',              vehicle_label: 'GJ-04-T-0055', driver_label: 'Ramesh Nair',  cargo_weight_kg: 6200,  planned_distance_km: 80,  status: 'Completed', eta: null, final_odometer: 215000, fuel_consumed: 30, revenue: 22000 },
  { id: 't07', code: 'TR-2026-007', source: 'Pune Hub',               destination: 'Nashik Depot',           vehicle_label: null,           driver_label: null,           cargo_weight_kg: 0,     planned_distance_km: 212, status: 'Cancelled', eta: null, note: 'Customer order cancelled' },
  { id: 't08', code: 'TR-2026-008', source: 'Mehsana Yard',           destination: 'Palanpur Cold Store',    vehicle_label: 'GJ-05-V-0873', driver_label: 'Priya Sharma', cargo_weight_kg: 780,   planned_distance_km: 68,  status: 'Completed', eta: null, final_odometer: 74100, fuel_consumed: 14, revenue: 9500 },
  { id: 't09', code: 'TR-2026-009', source: 'Kalol Depot',            destination: 'Gandhinagar Depot',      vehicle_label: 'GJ-01-M-8820', driver_label: 'Neha Joshi',  cargo_weight_kg: 500,   planned_distance_km: 18,  status: 'Completed', eta: null, final_odometer: 41600, fuel_consumed: 4, revenue: 5200 },
  { id: 't10', code: 'TR-2026-010', source: 'Jamnagar Port',          destination: 'Rajkot Warehouse',       vehicle_label: null,           driver_label: 'Kavita Reddy', cargo_weight_kg: 0,     planned_distance_km: 92,  status: 'Draft', eta: null, note: 'Port clearance pending' },
  { id: 't11', code: 'TR-2026-011', source: 'Indore Hub',             destination: 'Bhopal Depot',           vehicle_label: 'MP-09-V-1144', driver_label: 'Anita Desai', cargo_weight_kg: 420,   planned_distance_km: 190, status: 'Cancelled', eta: null, note: 'Road closure — rerouting' },
  { id: 't12', code: 'TR-2026-012', source: 'Surat Center',           destination: 'Ahmedabad Hub',          vehicle_label: 'GJ-18-M-3301', driver_label: 'Vikram Singh', cargo_weight_kg: 600,   planned_distance_km: 270, status: 'Completed', eta: null, final_odometer: 66200, fuel_consumed: 42, revenue: 18000 },
];

export const demoMaintenance: Maintenance[] = [
  { id: 'm01', vehicle_label: 'GJ-01-T-4421', service_type: 'Engine Overhaul',   cost: 42000, date: '2026-07-08', status: 'Active' },
  { id: 'm02', vehicle_label: 'GJ-18-M-3301', service_type: 'Tyre Replacement',  cost: 8400,  date: '2026-07-09', status: 'Active' },
  { id: 'm03', vehicle_label: 'GJ-23-T-9003', service_type: 'Brake System Repair', cost: 15500, date: '2026-07-05', status: 'Active' },
  { id: 'm04', vehicle_label: 'GJ-06-T-2218', service_type: 'Oil & Filter Change', cost: 3200, date: '2026-07-01', status: 'Closed' },
  { id: 'm05', vehicle_label: 'GJ-04-T-0055', service_type: 'AC Repair',          cost: 9800,  date: '2026-06-28', status: 'Closed' },
  { id: 'm06', vehicle_label: 'RJ-14-T-7781', service_type: 'Suspension Overhaul', cost: 22000, date: '2026-06-22', status: 'Closed' },
  { id: 'm07', vehicle_label: 'GJ-05-V-0873', service_type: 'Electrical Fault',   cost: 6500,  date: '2026-07-11', status: 'Active' },
  { id: 'm08', vehicle_label: 'KA-03-T-8812', service_type: 'Full Body Overhaul', cost: 85000, date: '2026-05-14', status: 'Closed' },
  { id: 'm09', vehicle_label: 'GJ-01-V-3398', service_type: 'Coolant Leak Fix',   cost: 4200,  date: '2026-07-03', status: 'Closed' },
  { id: 'm10', vehicle_label: 'GJ-02-M-7700', service_type: 'Clutch Plate Change', cost: 5600, date: '2026-07-10', status: 'Active' },
];

export const demoFuel: FuelLog[] = [
  { id: 'f01', vehicle_label: 'GJ-01-T-4421', date: '2026-07-10', liters: 120, fuel_cost: 9600 },
  { id: 'f02', vehicle_label: 'GJ-06-T-2218', date: '2026-07-10', liters: 135, fuel_cost: 10800 },
  { id: 'f03', vehicle_label: 'GJ-05-V-0873', date: '2026-07-09', liters: 45,  fuel_cost: 3600 },
  { id: 'f04', vehicle_label: 'GJ-04-T-0055', date: '2026-07-09', liters: 98,  fuel_cost: 7840 },
  { id: 'f05', vehicle_label: 'GJ-01-M-8820', date: '2026-07-08', liters: 30,  fuel_cost: 2400 },
  { id: 'f06', vehicle_label: 'RJ-14-T-7781', date: '2026-07-08', liters: 88,  fuel_cost: 7040 },
  { id: 'f07', vehicle_label: 'GJ-01-V-3398', date: '2026-07-07', liters: 52,  fuel_cost: 4160 },
  { id: 'f08', vehicle_label: 'MP-09-V-1144', date: '2026-07-07', liters: 22,  fuel_cost: 1760 },
  { id: 'f09', vehicle_label: 'GJ-18-M-3301', date: '2026-07-06', liters: 28,  fuel_cost: 2240 },
  { id: 'f10', vehicle_label: 'GJ-23-T-9003', date: '2026-07-05', liters: 110, fuel_cost: 8800 },
  { id: 'f11', vehicle_label: 'UP-32-T-6612', date: '2026-07-04', liters: 60,  fuel_cost: 4800 },
  { id: 'f12', vehicle_label: 'DL-1C-M-4411', date: '2026-07-04', liters: 18,  fuel_cost: 1440 },
];

export const demoExpenses: Expense[] = [
  { id: 'e01', trip_code: 'TR-2026-001', vehicle_label: 'GJ-01-T-4421', toll: 280,  other_misc: 120, maintenance_cost: 42000, total: 52000 },
  { id: 'e02', trip_code: 'TR-2026-002', vehicle_label: 'GJ-06-T-2218', toll: 640,  other_misc: 200, maintenance_cost: 3200,  total: 14840 },
  { id: 'e03', trip_code: 'TR-2026-003', vehicle_label: 'GJ-01-V-3398', toll: 90,   other_misc: 50,  maintenance_cost: 4200,  total: 8500  },
  { id: 'e04', trip_code: 'TR-2026-005', vehicle_label: 'RJ-14-T-7781', toll: 480,  other_misc: 180, maintenance_cost: 22000, total: 30560 },
  { id: 'e05', trip_code: 'TR-2026-006', vehicle_label: 'GJ-04-T-0055', toll: 210,  other_misc: 80,  maintenance_cost: 9800,  total: 13890 },
  { id: 'e06', trip_code: 'TR-2026-008', vehicle_label: 'GJ-05-V-0873', toll: 150,  other_misc: 0,   maintenance_cost: 6500,  total: 9760  },
  { id: 'e07', trip_code: 'TR-2026-009', vehicle_label: 'GJ-01-M-8820', toll: 40,   other_misc: 0,   maintenance_cost: 0,     total: 520   },
  { id: 'e08', trip_code: 'TR-2026-012', vehicle_label: 'GJ-18-M-3301', toll: 540,  other_misc: 250, maintenance_cost: 8400,  total: 14390 },
];

export const demoKpis: KPIs = {
  active_vehicles: 15,
  available_vehicles: 7,
  vehicles_in_maintenance: 3,
  active_trips: 3,
  pending_trips: 2,
  drivers_on_duty: 8,
  fleet_utilization_pct: 74,
};

export const demoStatusBreakdown = [
  { label: 'Available', value: 7,  color: 'var(--green)' },
  { label: 'On Trip',   value: 4,  color: 'var(--blue)'  },
  { label: 'In Shop',   value: 2,  color: 'var(--amber)' },
  { label: 'Retired',   value: 2,  color: 'var(--red)'   },
];

export const demoReport: ReportData = {
  fuel_efficiency_kmpl: 7.8,
  fleet_utilization_pct: 74,
  operational_cost: 143460,
  vehicle_roi_pct: 16.4,
  monthly_revenue: [
    { month: 'Jan', value: 48 }, { month: 'Feb', value: 42 }, { month: 'Mar', value: 61 },
    { month: 'Apr', value: 73 }, { month: 'May', value: 65 }, { month: 'Jun', value: 80 },
    { month: 'Jul', value: 93 },
  ],
  costliest_vehicles: [
    { label: 'GJ-23-T-9003', value: 52000 },
    { label: 'GJ-01-T-4421', value: 42000 },
    { label: 'GJ-06-T-2218', value: 14840 },
    { label: 'KA-03-T-8812', value: 14390 },
    { label: 'RJ-14-T-7781', value: 13890 },
  ],
};

export const TOTAL_OPERATIONAL_COST = 143460;
