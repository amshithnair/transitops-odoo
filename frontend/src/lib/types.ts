// Shared entity types (align with backend schemas). Frontend contract.

export interface VehicleDoc {
  id: string;
  label: 'RC' | 'Insurance' | 'Permit' | string;
  filename: string;
  dataUrl: string; // local preview; backend should store the file and return a URL instead
  uploaded_at: string;
}

export interface Vehicle {
  id: string;
  registration_number: string;
  name_model: string;
  type: string;
  max_load_capacity_kg: number;
  odometer_km: number;
  acquisition_cost: number;
  status: 'Available' | 'On Trip' | 'In Shop' | 'Retired' | string;
  region?: string | null;
  documents?: VehicleDoc[];
}

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry: string; // ISO date
  contact_number: string;
  safety_score: number;
  trip_completion_pct?: number;
  status: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended' | string;
}

export interface Trip {
  id: string;
  code?: string;
  source: string;
  destination: string;
  vehicle_id?: string | null;
  vehicle_label?: string | null;
  driver_id?: string | null;
  driver_label?: string | null;
  cargo_weight_kg: number;
  planned_distance_km: number;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled' | string;
  eta?: string | null;
  final_odometer?: number | null;
  fuel_consumed?: number | null;
  revenue?: number | null; // entered on completion; drives real ROI on Reports
  note?: string | null;
}

export interface Maintenance {
  id: string;
  vehicle_label: string;
  vehicle_id?: string;
  service_type: string;
  cost: number;
  date: string;
  status: 'Active' | 'Closed' | string;
}

export interface FuelLog {
  id: string;
  vehicle_label: string;
  date: string;
  liters: number;
  fuel_cost: number;
}

export interface Expense {
  id: string;
  trip_code: string;
  vehicle_label: string;
  toll: number;
  other_misc: number;
  maintenance_cost: number;
  total: number;
}

export interface KPIs {
  active_vehicles: number;
  available_vehicles: number;
  vehicles_in_maintenance: number;
  active_trips: number;
  pending_trips: number;
  drivers_on_duty: number;
  fleet_utilization_pct: number;
}

export const DEFAULT_KPIS: KPIs = {
  active_vehicles: 0,
  available_vehicles: 0,
  vehicles_in_maintenance: 0,
  active_trips: 0,
  pending_trips: 0,
  drivers_on_duty: 0,
  fleet_utilization_pct: 0
};

export interface ReportData {
  fuel_efficiency_kmpl: number;
  fleet_utilization_pct: number;
  operational_cost: number;
  vehicle_roi_pct: number;
  monthly_revenue: { month: string; value: number }[];
  costliest_vehicles: { label: string; value: number }[];
}

export const DEFAULT_REPORT_DATA: ReportData = {
  fuel_efficiency_kmpl: 0,
  fleet_utilization_pct: 0,
  operational_cost: 0,
  vehicle_roi_pct: 0,
  monthly_revenue: [],
  costliest_vehicles: []
};
