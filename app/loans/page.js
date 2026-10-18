'use client';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, bust, sb, getLoans, getPJ, inr, fd, wdate, isActive } from '../../lib/db';
import { asOn } from '../../lib/engine';
import { useSort } from '../../components/Sortable';
const F0 = { loc: '', link: '', min: '', max: '', from: '', to: '' };
export default function Loans() {
  const router = useRouter(), wd = wdate();
  const [act, setAct] = useState([]), [clo, setClo] = useState(null), [pjs, setPjs] = useState([]), [q, setQ] = useState(''), [st, setSt] = useState('active'), [ready, setReady] = useState(false), [f, setF] = useState(F0);
  useEffect(() => { Promise.all([getLoans('active'), getPJ()]).then(([l, p]) => { setAct(l); setPjs(p); setReady(true); }).catch(e => toast(e.message, 'err')); }, []);
  useEffect(() => { if (st !== 'active' && clo === null) getLoans('closed').then(setClo).catch(e => toast(e.message, 'err')); }, [st, clo]);
  const due = useMemo(() => Object.fromEntries(act.map(l => [l.id, asOn(l, wd)?.total])), [act, wd]);
  async function upd(l, patch) {
    const { error } = await sb.from('loans').update(patch).eq('id', l.id);
    if (error) return toast(error.message, 'err');
    setAct(a => a.map(x => x.id === l.id ? { ...x, ...patch } : x)); bust('loans:', 'pj:links'); toast('Saved');
  }
  const t = q.toLowerCase(), loading = !ready || (st !== 'active' && clo === null), nf = Object.values(f).filter(Boolean).length, fo = k => e => setF({ ...f, [k]: e.target.value });
  const src = st === 'active' ? act : st === 'closed' ? clo || [] : [...act, ...(clo || [])];
  const rows = src.filter(l => (String(l.id).includes(t) || (l.customers?.name || '').toLowerCase().includes(t)) && (!f.loc || l.location === f.loc) && (!f.link || (f.link === 'yes') === !!l.pj_no)
    && (!f.min || +l.principal_amount >= +f.min) && (!f.max || +l.principal_amount <= +f.max) && (!f.from || l.start_date >= f.from) && (!f.to || l.start_date <= f.to));
  const [list, th] = useSort(rows, { id: l => l.id, cust: l => l.customers?.name, start: l => l.start_date, prin: l => +l.principal_amount, due: l => due[l.id], loc: l => l.location, pj: l => l.pj_no, st: l => l.status }, 'id', 'desc');
  const total = list.reduce((s, l) => s + (due[l.id] || 0), 0), stop = e => e.stopPropagation();
  return (<>
    <div className="top"><h1>Loans</h1><Link className="btn" data-new href="/loans/new">+ New loan</Link></div>
    <div className="bar"><label className="grow">Search loan no. or customer<input type="search" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'ArrowDown' && (e.preventDefault(), document.querySelector('tr.go')?.focus())} /></label>
      <div className="tabs">{[['active', 'Active'], ['closed', 'Closed'], ['all', 'All']].map(([k, n]) => <button key={k} type="button" className={st === k ? 'on' : ''} onClick={() => setSt(k)}>{n}</button>)}</div></div>
    <details className="card filters"><summary>Filters{nf ? ` (${nf} on)` : ''}</summary>
      <div className="row"><label>Gold at<select value={f.loc} onChange={fo('loc')}><option value="">Any</option><option value="shop">Shop</option><option value="pj">PJ</option><option value="inside">Inside</option></select></label>
        <label>In a PJ<select value={f.link} onChange={fo('link')}><option value="">Any</option><option value="yes">Linked</option><option value="no">Not linked</option></select></label>
        <label>Min principal<input type="number" value={f.min} onChange={fo('min')} /></label><label>Max principal<input type="number" value={f.max} onChange={fo('max')} /></label>
        <label>Started from<input type="date" value={f.from} onChange={fo('from')} /></label><label>Started to<input type="date" value={f.to} onChange={fo('to')} /></label></div>
      <button type="button" className="ghost" onClick={() => setF(F0)}>Clear filters</button></details>
    <div className="t"><table><thead><tr>{th('id', 'No.')}{th('cust', 'Customer')}{th('start', 'Start')}{th('prin', 'Principal', 'n')}{th('due', `Due on ${fd(wd)}`, 'n')}{th('loc', 'Gold at')}{th('pj', 'PJ no.')}{th('st', 'Status')}</tr></thead>
      <tbody>{list.map(l => { const on = isActive(l.status); return (
        <tr key={l.id} className="go" tabIndex={0} onClick={() => router.push(`/loans/${l.id}`)} onKeyDown={e => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter') router.push(`/loans/${l.id}`); if (e.key === 'ArrowDown') { e.preventDefault(); e.currentTarget.nextElementSibling?.focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); e.currentTarget.previousElementSibling?.focus(); } }}>
          <td><Link href={`/loans/${l.id}`}>#{l.id}</Link></td><td>{l.customers?.name}</td><td>{fd(l.start_date)}</td><td className="n">{inr(l.principal_amount)}</td>
          <td className="n due">{on && due[l.id] != null ? inr(due[l.id]) : '-'}</td>
          <td onClick={stop}><select value={l.location || ''} disabled={!on} onChange={e => upd(l, { location: e.target.value, ...(e.target.value !== 'pj' && { pj_no: null }) })}><option value="shop">Shop</option><option value="pj">PJ</option><option value="inside">Inside</option></select></td>
          <td onClick={stop}><select value={l.pj_no || ''} disabled={!on || l.location !== 'pj'} onChange={e => upd(l, { pj_no: e.target.value ? +e.target.value : null })}><option value="">-</option>
            {pjs.filter(p => isActive(p.status) || p.pj_id === l.pj_no).map(p => <option key={p.pj_id} value={p.pj_id}>#{p.pj_id}</option>)}</select></td>
          <td>{l.status}{l.closed_date ? ` (${fd(l.closed_date)})` : ''}</td></tr>); })}</tbody></table></div>
    {loading ? <div className="empty">Loading…</div> : !list.length ? <div className="empty">No loans match.</div> : <p>{list.length} loans{st !== 'closed' && `, total due ${inr(total)}`}</p>}</>);
}
