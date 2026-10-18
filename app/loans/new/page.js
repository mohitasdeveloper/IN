'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, bust, sb, cached, getCustomers, inr, wdate } from '../../../lib/db';
const lab = c => `${c.name} - ${c.phone || '#' + c.id}`;
const LOCS = [['pj', 'PJ'], ['shop', 'Shop'], ['inside', 'Inside']];
export default function NewLoan() {
  const router = useRouter();
  const [cust, setCust] = useState([]), [rates, setRates] = useState([]), [isNew, setIsNew] = useState(false), [busy, setBusy] = useState(false);
  const [f, setF] = useState({ cust: '', nname: '', nphone: '', principal: '', rate: '', date: wdate(), loc: 'pj', articles: '', gross: '', net: '' });
  const set = k => e => setF({ ...f, [k]: e.target.value });
  useEffect(() => {
    getCustomers().then(setCust).catch(e => toast(e.message, 'err'));
    // your most-used rates, from a tiny request
    cached('rates', async () => { const { data } = await sb.from('loans').select('interest_rate').order('id', { ascending: false }).limit(200); const c = {}; (data || []).forEach(r => c[+r.interest_rate] = (c[+r.interest_rate] || 0) + 1); return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, 4).map(Number); }, 300000).then(setRates);
  }, []);
  const P = +f.principal || 0, r = +f.rate || 0, net = +f.net || 0, gross = +f.gross || 0, badWt = net && gross && net > gross;
  const d = new Date(f.date + 'T00:00'), nx = new Date(d); nx.setMonth(d.getMonth() + 1); if (nx.getDate() !== d.getDate()) nx.setDate(0);
  const ok = (isNew ? f.nname.trim() : f.cust) && P > 0 && f.rate !== '' && f.date && !badWt;
  async function save(e) {
    e.preventDefault(); if (busy) return; if (!ok) return toast('Please fill customer, principal and interest rate', 'err'); setBusy(true);
    try {
      let cid;
      if (isNew) { const { data, error } = await sb.from('customers').insert({ name: f.nname.trim(), phone: f.nphone.trim() || null }).select('id').single(); if (error) throw error; cid = data.id; bust('customers'); }
      else { const c = cust.find(x => lab(x) === f.cust); if (!c) throw new Error('Pick a customer from the list'); cid = c.id; }
      const { data, error } = await sb.from('loans').insert({ customer_id: cid, principal_amount: f.principal, interest_rate: f.rate, start_date: f.date, articles: f.articles || null, gross: f.gross || null, net: f.net || null, location: f.loc, status: 'Active' }).select('id').single();
      if (error) throw error; bust('loans:'); toast(`Loan #${data.id} created`); router.push(`/loans/${data.id}`);
    } catch (err) { toast(err.message, 'err'); setBusy(false); }
  }
  return (<>
    <h1>New loan</h1>
    <form className="split" onSubmit={save}>
      <div>
        <section className="card"><h2>Customer</h2>
          <div className="tabs"><button type="button" className={!isNew ? 'on' : ''} onClick={() => setIsNew(false)}>Existing customer</button><button type="button" className={isNew ? 'on' : ''} onClick={() => setIsNew(true)}>New customer</button></div>
          <div className="field">{!isNew
            ? <label>Search by name or phone<input autoFocus list="cl" value={f.cust} onChange={set('cust')} placeholder="Start typing…" autoComplete="off" /><datalist id="cl">{cust.map(c => <option key={c.id} value={lab(c)} />)}</datalist></label>
            : <div className="row"><label>Full name<input autoFocus value={f.nname} onChange={set('nname')} /></label><label>Phone<input type="tel" value={f.nphone} onChange={set('nphone')} /></label></div>}</div></section>
        <section className="card"><h2>Loan terms</h2>
          <div className="row"><label>Principal (₹)<input type="number" inputMode="decimal" step="0.01" min="1" value={f.principal} onChange={set('principal')} /></label>
            <label>Interest % a year<input type="number" inputMode="decimal" step="0.01" min="0" value={f.rate} onChange={set('rate')} /></label>
            <label>Start date<input type="date" value={f.date} onChange={set('date')} /></label></div>
          {rates.length > 0 && <div className="tabs field"><span className="hint">Your usual rates:</span>{rates.map(x => <button type="button" key={x} className={+f.rate === x ? 'on' : ''} onClick={() => setF({ ...f, rate: String(x) })}>{x}%</button>)}</div>}</section>
        <section className="card"><h2>Gold</h2>
          <div className="tabs">{LOCS.map(([k, n]) => <button type="button" key={k} className={f.loc === k ? 'on' : ''} onClick={() => setF({ ...f, loc: k })}>{n}</button>)}<span className="hint" style={{ alignSelf: 'center' }}>where the gold is kept</span></div>
          <div className="field"><label>Articles<input value={f.articles} onChange={set('articles')} placeholder="e.g. 2 gold bangles, 1 chain" /></label>
            <div className="row"><label>Gross weight (g)<input type="number" inputMode="decimal" step="0.01" min="0" value={f.gross} onChange={set('gross')} /></label>
              <label>Net weight (g)<input type="number" inputMode="decimal" step="0.01" min="0" value={f.net} onChange={set('net')} /></label></div>
            {badWt && <span className="err">Net weight cannot be more than gross weight.</span>}</div></section>
      </div>
      <aside className="card side"><h2>Summary</h2>
        <div className="sum">
          <div><span>Customer</span><b>{isNew ? f.nname || '-' : f.cust.split(' - ')[0] || '-'}</b></div>
          <div><span>Principal</span><b>{inr(P)}</b></div>
          <div><span>Interest a month</span><b>{f.rate === '' ? '-' : inr(P * r / 1200)}</b></div>
          <div><span>First due date</span><b>{f.date ? nx.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}</b></div>
          <div><span>Net gold</span><b>{net ? `${net} g` : '-'}</b></div>
          <div><span>Loan per gram</span><b>{net && P ? inr(P / net) : '-'}</b></div></div>
        <button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create loan'}</button></aside>
    </form></>);
}
