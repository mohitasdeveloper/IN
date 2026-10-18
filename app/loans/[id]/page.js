'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { toast, bust, sb, inr, fd, wdate, isActive } from '../../../lib/db';
import { loanOutstanding } from '../../../lib/engine';
const D = d => d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
export default function Detail() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null), [tx, setTx] = useState([]), [msg, setMsg] = useState(''), [amt, setAmt] = useState(''), [ty, setTy] = useState('Interest Payment');
  const load = useCallback(async () => {
    const { data, error } = await sb.from('loans').select('*, customers(*), loan_transactions(*)').eq('id', id).single();
    if (error) setMsg(error.message); setLoan(data); setTx([...(data?.loan_transactions || [])].sort((a, b) => a.txn_date.localeCompare(b.txn_date) || a.id - b.id));
  }, [id]);
  useEffect(() => { load(); }, [load]);
  if (!loan) return <p className="err">{msg || 'Loading…'}</p>;
  const wd = wdate(), o = loanOutstanding(loan, tx.filter(t => t.txn_date <= wd), new Date(wd + 'T00:00')), open = isActive(loan.status);
  async function add(e) {
    e.preventDefault(); const f = Object.fromEntries(new FormData(e.target));
    if (f.type === 'Principal Repayment' && +f.amount > o.principal + 0.005) return toast('That is more than the principal due', 'err');
    if (f.date < loan.start_date) return toast('Payment date is before the loan start date', 'err');
    const { error } = await sb.from('loan_transactions').insert({ loan_id: id, txn_date: f.date, amount: f.amount, txn_type: f.type, note: f.note || null });
    toast(error ? error.message : 'Entry added', error ? 'err' : 'ok'); if (!error) { e.target.reset(); setAmt(''); e.target.elements.namedItem('amount').focus(); bust('loans:'); load(); }
  }
  async function del(t) { if (!confirm('Delete this entry?')) return; const { error } = await sb.from('loan_transactions').delete().eq('id', t.id); toast(error ? error.message : 'Entry deleted', error ? 'err' : 'ok'); bust('loans:'); load(); }
  async function close() {
    if (wdate() < loan.start_date) return toast('Closing date is before the loan start date', 'err');
    if (!confirm(`Outstanding on ${fd(wdate())} is ${inr(loanOutstanding(loan, tx, new Date(wdate() + 'T00:00')).total)}. Close this loan?`)) return;
    const { error } = await sb.from('loans').update({ status: 'Closed', closed_date: wdate() }).eq('id', id); toast(error ? error.message : 'Loan closed', error ? 'err' : 'ok'); bust('loans:'); load();
  }
  return (<>
    <h1>Loan #{loan.id} · {loan.status}</h1>
    <div className="card grid">
      <div>Customer: <b>{loan.customers?.name}</b><br />Phone: {loan.customers?.phone || '-'}</div>
      <div>Opening principal: <b>{inr(loan.principal_amount)}</b><br />Rate: {loan.interest_rate}% a year</div>
      <div>Start: {fd(loan.start_date)}{loan.closed_date && <><br />Closed: {fd(loan.closed_date)}</>}<br />Gold at: {loan.location}{loan.pj_no ? ` (PJ #${loan.pj_no})` : ''}</div>
      <div>Articles: {loan.articles || '-'}<br />Gross {loan.gross || '-'} g · Net {loan.net || '-'} g</div></div>
    <div className="grid"><div className="card k"><span>Principal due</span><b>{inr(o.principal)}</b></div><div className="card k"><span>Interest due</span><b>{inr(o.interest)}</b></div>
      <div className="card k"><span>Total due on {fd(wd)}</span><b className="hero" style={{ fontSize: '1.6rem' }}>{inr(o.total)}</b></div></div>
    {open && <form className="card row" onSubmit={add}>
      <label>Date<input name="date" type="date" defaultValue={wdate()} required /></label><label>Amount (₹)<input name="amount" data-new type="number" step="0.01" min="0.01" value={amt} onChange={e => setAmt(e.target.value)} required /></label>
      <label>Type<select name="type" value={ty} onChange={e => setTy(e.target.value)}><option>Interest Payment</option><option>Principal Repayment</option><option>Top-up</option></select></label><label>Note<input name="note" /></label><div className="tabs"><button type="button" className="ghost" onClick={() => { setTy('Interest Payment'); setAmt(Math.max(0, o.interest).toFixed(2)); }}>Fill interest due</button><button type="button" className="ghost" onClick={() => { setTy('Principal Repayment'); setAmt(Math.max(0, o.principal).toFixed(2)); }}>Fill principal due</button></div><button>Add payment</button></form>}
    <h2>Monthly interest</h2>
    <div className="t"><table><thead><tr><th>Due date</th><th className="n">Charged on (highest principal)</th><th className="n">Interest</th></tr></thead>
      <tbody>{o.rows.map((r, i) => <tr key={i}><td>{D(r.date)}{r.running && ' (running)'}</td><td className="n">{inr(r.principal)}</td><td className="n">+{inr(r.interest)}</td></tr>)}</tbody></table></div>
    <h2>Payments</h2>
    <div className="t"><table><thead><tr><th>Date</th><th>Type</th><th>Note</th><th className="n">Amount</th><th></th></tr></thead>
      <tbody>{[...tx].reverse().map(t => <tr key={t.id}><td>{fd(t.txn_date)}</td><td>{t.txn_type}</td><td>{t.note}</td><td className="n">{inr(t.amount)}</td><td><button className="ghost" onClick={() => del(t)}>Delete</button></td></tr>)}</tbody></table></div>
    {open && <p><button className="danger" onClick={close}>Close this loan</button></p>}</>);
}
