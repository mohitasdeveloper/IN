'use client';
import { useEffect, useState, useCallback } from 'react';
import { toast, bust, getCustomers } from '../../lib/db';
import { useSort } from '../../components/Sortable';
export default function Customers() {
  const [rows, setRows] = useState([]), [q, setQ] = useState(''), [msg, setMsg] = useState('');
  const load = useCallback(async () => setRows(await getCustomers()), []);
  useEffect(() => { load(); }, [load]);
  async function add(e) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    const { error } = await sb.from('customers').insert({ name: f.name, phone: f.phone || null, address: f.address || null });
    toast(error ? error.message : 'Customer added', error ? 'err' : 'ok'); if (!error) { const fm = e.target; fm.reset(); fm.elements.namedItem('name').focus(); bust('customers'); load(); }
  }
  const t = q.toLowerCase(), [list, th] = useSort(rows.filter(c => c.name.toLowerCase().includes(t) || (c.phone || '').includes(t) || (c.address || '').toLowerCase().includes(t)), { name: c => c.name, phone: c => c.phone, address: c => c.address }, 'name');
  return (<>
    <h1>Customers</h1>
    <details className="card"><summary data-new>Add customer</summary><form className="row" onSubmit={add}>
      <label>Name<input name="name" required /></label><label>Phone<input name="phone" type="tel" /></label>
      <label>Address<input name="address" /></label><button>Add customer</button></form></details>
    <label className="grow">Search name, phone or address<input type="search" value={q} onChange={e => setQ(e.target.value)} /></label>
    <div className="t"><table><thead><tr>{th('name', 'Name')}{th('phone', 'Phone')}{th('address', 'Address')}</tr></thead>
      <tbody>{list.map(c => <tr key={c.id}><td>{c.name}</td><td>{c.phone}</td><td>{c.address}</td></tr>)}</tbody></table></div></>);
}
