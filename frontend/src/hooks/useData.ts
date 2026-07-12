import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export function useData<T>(url: string, params?: Record<string, unknown>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const key = JSON.stringify(params ?? {});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await client.get(url, { params });
      const payload = res.data;
      // Accept either an array/object directly or {items:[...]}
      const value = (payload && payload.items !== undefined) ? payload.items : payload;
      setData(value as T);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err.message || 'Failed to fetch data');
      setData(null);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, key]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load, setData };
}

// Client-side text search across chosen fields.
export function filterBy<T>(rows: T[], query: string, fields: (keyof T)[]): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter((r) => fields.some((f) => String(r[f] ?? '').toLowerCase().includes(q)));
}
