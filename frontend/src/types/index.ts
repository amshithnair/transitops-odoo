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
  manufacturer?: string | null;
  fuel_type?: string | null;
  purchase_date?: string | null;
  insurance_expiry?: string | null;
  fitness_expiry?: string | null;
  puc_expiry?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  last_location_update?: string | null;
  created_at?: string;
}

export interface Driver {
  id: string;
  name: string;
  license_number: string;
  license_category: string;
  license_expiry_date: string; // ISO date
  contact_number?: string | null;
  email?: string | null;
  experience_years?: number | null;
  assigned_vehicle_id?: string | null;
  assigned_vehicle_registration?: string | null;
  safety_score: number;
  status: 'Available' | 'On Trip' | 'Off Duty' | 'Suspended' | string;
  created_at?: string;
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
  actual_distance_km?: number | null;
  fuel_consumed_liters?: number | null;
  revenue?: number;
  status: 'Draft' | 'Dispatched' | 'Completed' | 'Cancelled' | string;
  eta?: string | null;
  final_odometer?: number | null;
  fuel_consumed?: number | null;
  note?: string | null;
  dispatched_at?: string | null;
  completed_at?: string | null;
  created_at?: string;
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
  vehicle_id: string;
  driver_id?: string | null;
  trip_id?: string | null;
  liters: number;
  cost: number;
  date: string;
  odometer_km?: number | null;
  vehicle_registration?: string | null;
  driver_name?: string | null;
  mileage_kmpl?: number | null;
}

export interface Expense {
  id: string;
  vehicle_id: string;
  driver_id?: string | null;
  category: 'Toll' | 'Fine' | 'Parking' | 'Other' | string;
  amount: number;
  date: string;
  description?: string | null;
  notes?: string | null;
  vehicle_registration?: string | null;
  driver_name?: string | null;
}

export interface StatusBreakdown {
  label: string;
  value: number;
  color: string;
}

export interface KPIs {
  total_vehicles: number;
  active_vehicles: number;
  available_vehicles: number;
  vehicles_in_maintenance: number;
  total_drivers: number;
  available_drivers: number;
  active_trips: number;
  pending_trips: number;
  drivers_on_duty: number;
  fleet_utilization_pct: number;
  total_fuel_cost: number;
  monthly_expense: number;
  average_mileage: number | null;
  vehicle_status_breakdown: StatusBreakdown[];
}

export interface ReportData {
  fuel_efficiency_kmpl: number | null;
  fleet_utilization_pct: number;
  operational_cost: number;
  vehicle_roi_pct: number | null;
  monthly_revenue: { month: string; value: number }[];
  costliest_vehicles: { label: string; value: number }[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

// Dispatch
export interface DispatchScore {
  availability: number;
  capacity_fit: number;
  fuel_efficiency: number;
  maintenance_status: number;
  safety_score: number;
  vehicle_condition: number;
}

export interface DispatchRecommendation {
  rank: number;
  vehicle: Vehicle;
  driver: Driver;
  total_score: number;
  scores: DispatchScore;
  reasoning: string;
}

// Map
export interface MapVehicle {
  id: string;
  registration_number: string;
  name_model: string;
  type: string;
  status: string;
  latitude: number | null;
  longitude: number | null;
  last_location_update: string | null;
  driver_name: string | null;
  driver_id: string | null;
}

// Fuel/Expense Summaries
export interface FuelExpenseSummary {
  total_fuel_cost: number;
  total_fuel_liters: number;
  total_expense_amount: number;
  monthly_fuel: { year: number; month: number; total: number }[];
  monthly_expense: { year: number; month: number; total: number }[];
  vehicle_totals: { vehicle: string; fuel_cost: number; expense_cost: number; total: number }[];
  driver_totals: { driver: string; fuel_cost: number; expense_cost: number; total: number }[];
}

// Report sub-types
export interface FuelEfficiencyReport {
  vehicle_id: string;
  registration_number: string;
  total_distance_km: number;
  total_fuel_liters: number;
  efficiency_km_per_liter: number | null;
}

export interface OperationalCostReport {
  vehicle_id: string;
  registration_number: string;
  fuel_cost: number;
  maintenance_cost: number;
  expense_cost: number;
  total_cost: number;
}

export interface VehicleROIReport {
  vehicle_id: string;
  registration_number: string;
  total_revenue: number;
  total_cost: number;
  acquisition_cost: number;
  roi_pct: number | null;
}
