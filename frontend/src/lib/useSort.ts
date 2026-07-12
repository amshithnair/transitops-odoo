import { useMemo, useState } from 'react';

export type SortDir = 'asc' | 'desc';

// Generic client-side table sort. Click a column key to sort; click again to flip direction.
export function useSort<T>(rows: T[], initialKey?: keyof T) {
  const [key, setKey] = useState<keyof T | undefined>(initialKey);
  const [dir, setDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    if (!key) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[key]; const bv = b[key];
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return av - bv;
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: 'base' });
      return cmp;
    });
    if (dir === 'desc') copy.reverse();
    return copy;
  }, [rows, key, dir]);

  const toggle = (k: keyof T) => {
    if (k === key) setDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setKey(k); setDir('asc'); }
  };

  const arrow = (k: keyof T) => (k === key ? (dir === 'asc' ? '▲' : '▼') : '');

  return { sorted, sortKey: key, sortDir: dir, toggle, arrow };
}
