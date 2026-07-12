// Single source of truth for RBAC — matches hackathon spec Section 6 matrix exactly.
// NOTE: backend role key for the Dispatcher is `driver` (legacy). We keep the key
// for API compatibility but always DISPLAY it as "Dispatcher" per the spec.

import type { UserRole } from '../context/AuthContext';

export type Section = 'fleet' | 'drivers' | 'trips' | 'fuel' | 'analytics';
export type Access = 'crud' | 'view' | 'none';

export const ROLE_LABELS: Record<UserRole, string> = {
  fleet_manager: 'Fleet Manager',
  driver: 'Dispatcher',
  safety_officer: 'Safety Officer',
  financial_analyst: 'Financial Analyst',
};

export const ROLE_COLORS: Record<UserRole, string> = {
  fleet_manager: 'var(--accent)',
  driver: 'var(--blue)',
  safety_officer: 'var(--green)',
  financial_analyst: 'var(--amber)',
};

export const ROLE_SCOPE: Record<UserRole, string> = {
  fleet_manager: 'Full access — every module & action',
  driver: 'Dashboard, Trips',
  safety_officer: 'Drivers, Compliance',
  financial_analyst: 'Fuel & Expenses, Analytics',
};

export const ALL_ROLES: UserRole[] = ['fleet_manager', 'driver', 'safety_officer', 'financial_analyst'];

// RBAC matrix — rows=role, cols=section.
export const RBAC: Record<UserRole, Record<Section, Access>> = {
  fleet_manager:    { fleet: 'crud', drivers: 'crud', trips: 'crud', fuel: 'crud', analytics: 'crud' },
  driver:           { fleet: 'view', drivers: 'none', trips: 'crud', fuel: 'none', analytics: 'none' },
  safety_officer:   { fleet: 'none', drivers: 'crud', trips: 'view', fuel: 'none', analytics: 'none' },
  financial_analyst:{ fleet: 'view', drivers: 'none', trips: 'none', fuel: 'crud', analytics: 'crud' },
};

export function access(role: UserRole | undefined, section: Section): Access {
  if (!role) return 'none';
  return RBAC[role][section];
}

export function canView(role: UserRole | undefined, section: Section): boolean {
  return access(role, section) !== 'none';
}

export function canEdit(role: UserRole | undefined, section: Section): boolean {
  return access(role, section) === 'crud';
}

export function roleLabel(role: UserRole | undefined): string {
  return role ? ROLE_LABELS[role] : '';
}

// Section metadata for RBAC matrix UI (Settings screen)
export const SECTION_LABELS: { key: Section; label: string }[] = [
  { key: 'fleet', label: 'Fleet' },
  { key: 'drivers', label: 'Drivers' },
  { key: 'trips', label: 'Trips' },
  { key: 'fuel', label: 'Fuel/Exp' },
  { key: 'analytics', label: 'Analytics' },
];
