// Shared entity types (align with backend schemas). Frontend contract.

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

export interface ReportData {
  fuel_efficiency_kmpl: number;
  fleet_utilization_pct: number;
  operational_cost: number;
  vehicle_roi_pct: number;
  monthly_revenue: { month: string; value: number }[];
  costliest_vehicles: { label: string; value: number }[];
}
