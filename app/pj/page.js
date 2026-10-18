'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { toast, bust, getPJ, cached, sb, all, inr, fd, wdate, isActive } from '../../lib/db';
import { pjMonths, pjInterest } from '../../lib/engine';
import { useSort } from '../../components/Sortable';
const F0 = { link: '', min: '', max: '', from: '', to: '' };
export default function PJ() {
  const [pjs, setPjs] = useState([]), [loans, setLoans] = useState([]), [q, setQ] = useState(''), [st, setSt] = useState('all'), [fl, setFl] = useState(F0);
  const load = useCallback(async () => {
    const [p, l] = await Promise.all([getPJ(), cached('pj:links', () => all(() => sb.from('loans').select('id,pj_no,principal_amount,status,customers(name)').not('pj_no', 'is', null).order('id')))]);
    setPjs(p); setLoans(l);
  }, []);
  useEffect(() => { load().catch(e => toast(e.message, 'err')); }, [load]);
  const nd = new Date(wdate() + 'T00:00'), next = Math.max(0, ...pjs.map(p => p.pj_id)) + 1, fo = k => e => setFl({ ...fl, [k]: e.target.value }), nf = Object.values(fl).filter(Boolean).length;
  async function add(e) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    const { error } = await sb.from('pj').insert({ pj_id: f.pj_id, date: f.date, amount: f.amount, net: f.net || null, status: 'Active' });
    toast(error ? error.message : 'PJ entry created', error ? 'err' : 'ok');
    if (!error) { const fm = e.target; fm.reset(); fm.elements.pj_id.value = +f.pj_id + 1; fm.elements.amount.focus(); bust('pj:'); load(); }
  }
  async function setStatus(p, s) {
    if (!confirm(`Mark PJ #${p.pj_id} as ${s}?`)) return;
    if (s === 'Closed' && wdate() < p.date) return toast('Release date is before the PJ date', 'err');
    let { error } = await sb.from('pj').update({ status: s, closed_date: s === 'Closed' ? wdate() : null }).eq('pj_id', p.pj_id);
    if (error && /closed_date/.test(error.message)) ({ error } = await sb.from('pj').update({ status: s }).eq('pj_id', p.pj_id));
    toast(error ? error.message : 'Saved', error ? 'err' : 'ok'); bust('pj:'); load();
  }
  // Active: interest to the working date. Released: interest to the release date (what was paid to PJ).
  const I = Object.fromEntries(pjs.map(p => { const on = isActive(p.status), at = on ? nd : p.closed_date ? new Date(p.closed_date + 'T00:00') : null, ls = loans.filter(l => l.pj_no === p.pj_id);
    return [p.pj_id, { on, ls, lp: ls.reduce((s, l) => s + +l.principal_amount, 0), m: at ? pjMonths(p.date, at) : null, i: at ? pjInterest(p, at) : null }]; }));
  const rows = pjs.filter(p => String(p.pj_id).includes(q) && (st === 'all' || (st === 'active') === I[p.pj_id].on) && (!fl.link || (fl.link === 'yes') === !!I[p.pj_id].ls.length)
    && (!fl.min || +p.amount >= +fl.min) && (!fl.max || +p.amount <= +fl.max) && (!fl.from || p.date >= fl.from) && (!fl.to || p.date <= fl.to));
  const [list, th] = useSort(rows, { id: p => p.pj_id, date: p => p.date, amount: p => +p.amount, net: p => p.net == null ? null : +p.net, m: p => I[p.pj_id].m, i: p => I[p.pj_id].i, n: p => I[p.pj_id].ls.length, lp: p => I[p.pj_id].lp, st: p => p.status, rel: p => p.closed_date }, 'id', 'desc');
  return (<>
    <div className="top"><h1>PJ</h1></div>
    <details className="card"><summary data-new>New PJ entry</summary>
      <form className="row" onSubmit={add}>
        <label>PJ no.<input name="pj_id" type="number" defaultValue={next} required /></label><label>Date received<input name="date" type="date" defaultValue={wdate()} required /></label>
        <label>Amount received (₹)<input name="amount" type="number" step="0.01" required /></label><label>Net wt (g)<input name="net" type="number" step="0.01" /></label><button>Create PJ entry</button></form></details>
    <div className="bar"><label className="grow">Search PJ no.<input type="search" value={q} onChange={e => setQ(e.target.value)} /></label>
      <div className="tabs">{[['all', 'All'], ['active', 'Active'], ['closed', 'Released']].map(([k, n]) => <button key={k} type="button" className={st === k ? 'on' : ''} onClick={() => setSt(k)}>{n}</button>)}</div></div>
    <details className="card filters"><summary>Filters{nf ? ` (${nf} on)` : ''}</summary>
      <div className="row"><label>Linked loans<select value={fl.link} onChange={fo('link')}><option value="">Any</option><option value="yes">Has loans</option><option value="no">Unlinked</option></select></label>
        <label>Min amount<input type="number" value={fl.min} onChange={fo('min')} /></label><label>Max amount<input type="number" value={fl.max} onChange={fo('max')} /></label>
        <label>Received from<input type="date" value={fl.from} onChange={fo('from')} /></label><label>Received to<input type="date" value={fl.to} onChange={fo('to')} /></label></div>
      <button type="button" className="ghost" onClick={() => setFl(F0)}>Clear filters</button></details>
    <div className="t"><table><thead><tr>{th('id', 'PJ no.')}{th('date', 'Received on')}{th('amount', 'Amount', 'n')}{th('net', 'Net g', 'n')}{th('m', 'Months')}{th('i', 'Interest', 'n')}{th('n', 'Linked loans')}{th('lp', 'Linked principal', 'n')}{th('st', 'Status')}{th('rel', 'Released on')}</tr></thead>
      <tbody>{list.map(p => { const x = I[p.pj_id]; return (
        <tr key={p.pj_id}><td>#{p.pj_id}</td><td>{fd(p.date)}</td><td className="n">{inr(p.amount)}</td><td className="n">{p.net ?? '-'}</td><td>{x.m ?? '-'}</td><td className="n">{x.i == null ? '-' : inr(x.i)}</td>
          <td className="wrap">{x.ls.length ? x.ls.map(l => <Link key={l.id} className="badge" href={`/loans/${l.id}`}>#{l.id} {l.customers?.name}</Link>) : 'Unlinked'}</td><td className="n">{inr(x.lp)}</td>
          <td><select value={x.on ? 'Active' : 'Closed'} onChange={e => setStatus(p, e.target.value)}><option value="Active">Active</option><option value="Closed">Released</option></select></td>
          <td>{p.closed_date ? fd(p.closed_date) : x.on ? '-' : 'Not recorded'}</td></tr>); })}</tbody></table></div>
    {!list.length && <div className="empty">No PJ entries match.</div>}
    <p className="hint">Interest for a released PJ entry is up to its release date. For an active one it is up to the working date.</p></>);
}
