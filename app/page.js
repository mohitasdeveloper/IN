'use client';
import { useEffect, useState } from 'react';
import { sb, cached, getLoans, getPJ, pjLive, inr, fd, wdate } from '../lib/db';
import { asOn, pjInterest } from '../lib/engine';
const K = ({ t, v }) => <div className="card k"><span>{t}</span><b>{v}</b></div>;
export default function Dashboard() {
  const [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => {
    (async () => {
      const [loans, pjs, cust] = await Promise.all([getLoans('active'), getPJ(), cached('customers:count', async () => (await sb.from('customers').select('id', { count: 'exact', head: true })).count)]);
      const wd = wdate(), nd = new Date(wd + 'T00:00'); let lp = 0, li = 0, n = 0;
      loans.forEach(l => { const o = asOn(l, wd); if (!o) return; n++; lp += o.principal; li += o.interest; });
      const ap = pjs.filter(p => pjLive(p, wd)); let pp = 0, pi = 0;
      ap.forEach(p => { pp += +p.amount; pi += pjInterest(p, nd); });
      setD({ lp, li, pp, pi, n, c: cust, pn: ap.length });
    })().catch(e => setErr(e.message));
  }, []);
  if (err) return <p className="err">{err}</p>;
  if (!d) return <p>Loading…</p>;
  return (<>
    <h1>Dashboard</h1><p className="hint">As on {fd(wdate())} (working date). For exact past dates, use Reports.</p>
    <div className="card"><span>Net balance (loans with interest − PJ with interest)</span><p className="hero">{inr(d.lp + d.li - d.pp - d.pi)}</p></div>
    <h2>Customer loans</h2>
    <div className="grid"><K t="Total outstanding" v={inr(d.lp + d.li)} /><K t="Principal outstanding" v={inr(d.lp)} /><K t="Interest accrued" v={inr(d.li)} /><K t="Active loans" v={d.n} /><K t="Customers" v={d.c} /></div>
    <h2>PJ</h2>
    <div className="grid"><K t="PJ outstanding" v={inr(d.pp + d.pi)} /><K t="PJ principal" v={inr(d.pp)} /><K t="PJ interest" v={inr(d.pi)} /><K t="Active PJ entries" v={d.pn} /></div></>);
}
