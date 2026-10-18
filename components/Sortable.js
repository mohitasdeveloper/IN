'use client';
import { useMemo, useState } from 'react';
// Sort rows by a column accessor; th(key, label, className) renders a keyboard-friendly sortable header.
export function useSort(rows, acc, k0, d0 = 'asc') {
  const [s, setS] = useState({ k: k0, d: d0 });
  const out = useMemo(() => {
    const f = acc[s.k]; if (!f) return rows; const m = s.d === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => { const x = f(a), y = f(b); if (x == null && y == null) return 0; if (x == null) return 1; if (y == null) return -1;
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * m; });
  }, [rows, s]);
  const th = (k, label, cls = '') => <th key={k} className={cls} aria-sort={s.k === k ? (s.d === 'asc' ? 'ascending' : 'descending') : 'none'}>
    <button type="button" className="sort" onClick={() => setS(p => ({ k, d: p.k === k && p.d === 'asc' ? 'desc' : 'asc' }))}>{label}{s.k === k ? (s.d === 'asc' ? ' ▲' : ' ▼') : ''}</button></th>;
  return [out, th];
}
