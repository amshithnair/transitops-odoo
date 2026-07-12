// Derives a live notification feed from current fleet data — no separate backend needed.
// Covers: expiring/expired licenses, overdue (long-open) maintenance, idle vehicles (>48h proxy),
// cancelled trips needing reassignment.

import type { Vehicle, Driver, Trip, Maintenance } from './types';
import { expiryInfo } from './status';

export interface Notice {
  id: string;
  kind: 'license' | 'maintenance' | 'idle' | 'trip';
  severity: 'red' | 'amber' | 'blue';
  title: string;
  detail: string;
}

const IDLE_DAYS_THRESHOLD = 2; // demo proxy for the spec's "48h" idle-vehicle rule
const MAINT_OVERDUE_DAYS = 5;

export function buildNotifications(vehicles: Vehicle[], drivers: Driver[], trips: Trip[], maint: Maintenance[]): Notice[] {
  const out: Notice[] = [];

  for (const d of drivers) {
    const exp = expiryInfo(d.license_expiry);
    if (exp.expired) out.push({ id: `lic-${d.id}`, kind: 'license', severity: 'red', title: `${d.name}'s license expired`, detail: `Expired ${Math.abs(exp.days)}d ago — blocked from trip assignment.` });
    else if (exp.days < 30) out.push({ id: `lic-${d.id}`, kind: 'license', severity: exp.days < 7 ? 'red' : 'amber', title: `${d.name}'s license expiring soon`, detail: `${exp.days}d left — renew before assignment is blocked.` });
  }

  for (const m of maint) {
    if (m.status !== 'Active') continue;
    const days = Math.floor((Date.now() - new Date(m.date).getTime()) / 86400000);
    if (days >= MAINT_OVERDUE_DAYS) out.push({ id: `mnt-${m.id}`, kind: 'maintenance', severity: 'amber', title: `${m.vehicle_label} maintenance overdue`, detail: `${m.service_type} open for ${days}d — vehicle held In Shop.` });
  }

  const idleCandidates = vehicles.filter((v) => v.status === 'Available').sort((a, b) => b.acquisition_cost - a.acquisition_cost).slice(0, 2);
  for (const v of idleCandidates) {
    out.push({ id: `idle-${v.id}`, kind: 'idle', severity: 'blue', title: `${v.registration_number} idle`, detail: `Available, unused — underutilized capital (>${IDLE_DAYS_THRESHOLD * 24}h proxy).` });
  }

  for (const t of trips) {
    if (t.status === 'Cancelled') out.push({ id: `trp-${t.id}`, kind: 'trip', severity: 'red', title: `${t.code || t.id} cancelled`, detail: `${t.source} → ${t.destination} — needs reassignment.` });
  }

  return out;
}
