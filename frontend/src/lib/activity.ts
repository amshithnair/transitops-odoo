// Frontend activity/audit log — every cascade-triggering mutation logs here.
// Persisted to localStorage so it survives refresh during a demo session.
// Backend should eventually own this; this gives instant "why did X change" answers now.

export interface ActivityEvent {
  id: string;
  ts: string; // ISO timestamp
  actor: string; // user name
  role: string; // role label
  entity: 'Vehicle' | 'Driver' | 'Trip' | 'Maintenance';
  entityLabel: string; // e.g. "VAN-05", "TR001"
  action: string; // e.g. "Dispatched", "Completed", "Closed"
  detail?: string;
}

const KEY = 'transitops_activity_log';
const MAX = 300;

function read(): ActivityEvent[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function write(events: ActivityEvent[]) {
  localStorage.setItem(KEY, JSON.stringify(events.slice(0, MAX)));
}

export function logActivity(e: Omit<ActivityEvent, 'id' | 'ts'>) {
  const events = read();
  events.unshift({ ...e, id: `a${Date.now()}${Math.random().toString(36).slice(2, 6)}`, ts: new Date().toISOString() });
  write(events);
  window.dispatchEvent(new Event('activity-log-updated'));
}

export function getActivity(entityLabel?: string): ActivityEvent[] {
  const events = read();
  return entityLabel ? events.filter((e) => e.entityLabel === entityLabel) : events;
}

export function clearActivity() {
  write([]);
  window.dispatchEvent(new Event('activity-log-updated'));
}
