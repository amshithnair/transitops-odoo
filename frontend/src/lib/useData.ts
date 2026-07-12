import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

// GET `url`; if the backend is unreachable/errors, data remains initialData
// `live` = true when real API responded.
export function useData<T>(url: string, initialData: T, params?: Record<string, unknown>) {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  const key = JSON.stringify(params ?? {});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await client.get(url, { params });
      const payload = res.data;
      // Accept either an array/object directly or {items:[...]}
      const value = (payload && payload.items !== undefined) ? payload.items : payload;
      setData(value as T);
      setLive(true);
    } catch {
      setLive(false);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, live, reload: load, setData };
}

// Client-side text search across chosen fields.
export function filterBy<T>(rows: T[], query: string, fields: (keyof T)[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => fields.some((f) => String(r[f] ?? '').toLowerCase().includes(q)));
}
