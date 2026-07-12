// Central status -> badge-color mapping. Status strings match the exact spec enums.

export type BadgeColor = 'green' | 'blue' | 'amber' | 'red' | 'gray';

const MAP: Record<string, BadgeColor> = {
  // Vehicle
  'Available': 'green',
  'On Trip': 'blue',
  'In Shop': 'amber',
  'Retired': 'red',
  // Driver
  'Off Duty': 'gray',
  'Suspended': 'red',
  // Trip
  'Draft': 'gray',
  'Dispatched': 'blue',
  'Completed': 'green',
  'Cancelled': 'red',
  // Maintenance (spec enum: Active / Closed)
  'Active': 'amber',
  'Closed': 'green',
};

export function statusColor(status: string): BadgeColor {
  return MAP[status] ?? 'gray';
}

// Safety score -> color band
export function safetyColor(score: number): BadgeColor {
  if (score >= 90) return 'green';
  if (score >= 75) return 'blue';
  if (score >= 60) return 'amber';
  return 'red';
}

// License expiry countdown -> color (bonus: color-coded expiry badges)
export function expiryInfo(expiry: string): { days: number; color: BadgeColor; expired: boolean; label: string } {
  const d = new Date(expiry);
  const days = Math.ceil((d.getTime() - Date.now()) / 86400000);
  const expired = days < 0;
  let color: BadgeColor = 'green';
  if (expired) color = 'red';
  else if (days < 7) color = 'red';
  else if (days < 30) color = 'amber';
  const label = expired ? 'EXPIRED' : `${days}d left`;
  return { days, color, expired, label };
}

export function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function fmtNum(n: number): string {
  return n.toLocaleString('en-IN');
}
