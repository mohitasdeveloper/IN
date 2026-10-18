'use client';
import { useEffect, useMemo, useState } from 'react';
import { toast, sb, all, cached, getPJ, pjLive, inr, fd, wdate, isActive } from '../../lib/db';
import { useSort } from '../../components/Sortable';
import { loanOutstanding, PJ_RATE, pjMonths } from '../../lib/engine';
const FULL = 'id,customer_id,principal_amount,interest_rate,start_date,status,closed_date,location,pj_no,articles,gross,net,customers(name,phone),loan_transactions(loan_id,txn_date,txn_type,amount,note)';
const TABS = [['summary', 'Summary'], ['register', 'Loan register'], ['ageing', 'Ageing'], ['pj', 'PJ register'], ['gold', 'Gold stock'], ['daybook', 'Day book'], ['monthly', 'Monthly collections'], ['customer', 'Customer ledger'], ['statement', 'Customer statement'], ['spread', 'Spread'], ['overdue', 'Overdue list']];
const D = s => new Date(s + 'T00:00');
// State of a loan as on date d: null if not running then; payments after d are ignored.
function snap(l, d) {
  if (l.start_date > d) return null;
  if (String(l.status).toLowerCase() === 'closed' && (!l.closed_date || l.closed_date <= d)) return null;
  const o = loanOutstanding({ ...l, status: 'Active', closed_date: null }, l.loan_transactions.filter(t => t.txn_date <= d), D(d));
  return { l, o };
}
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const isClosed = l => String(l.status).toLowerCase() === 'closed' && !!l.closed_date;
// Closing a loan: principal + interest due on the closing date is received.
const settle = l => { const o = loanOutstanding(l, l.loan_transactions.filter(t => t.txn_date <= l.closed_date), D(l.closed_date)); return { principal: Math.max(0, o.principal), interest: Math.max(0, o.interest), total: Math.max(0, o.total) }; };
// Releasing a PJ entry: the amount plus PJ interest up to the release date is paid.
const pjPay = p => +p.amount * (1 + PJ_RATE / 12 * pjMonths(p.date, D(p.closed_date)));
function build(k, d, loans, pjs, cid, mo) {
  const nd = D(d), live = loans.map(l => snap(l, d)).filter(Boolean);
  const pj = pjs.filter(p => pjLive(p, d)).map(p => ({ p, m: pjMonths(p.date, nd), i: +p.amount * PJ_RATE / 12 * pjMonths(p.date, nd) }));
  const lp = sum(live, x => x.o.principal), li = sum(live, x => x.o.interest), pp = sum(pj, x => +x.p.amount), pi = sum(pj, x => x.i);
  if (k === 'summary') return { cols: ['Item', 'Amount'], money: [1], rows: [['Active loans', String(live.length)], ['Loan principal', lp], ['Loan interest due', li], ['Total loans outstanding', lp + li], ['Active PJ entries', String(pj.length)], ['PJ principal', pp], ['PJ interest', pi], ['Total PJ outstanding', pp + pi], ['Net balance (loans - PJ)', lp + li - pp - pi]] };
  if (k === 'register') return { sum: 1, cols: ['Loan', 'Customer', 'Start', 'Principal', 'Interest', 'Total due', 'Gold at', 'PJ no.'], date: [2], money: [3, 4, 5], rows: live.map(({ l, o }) => ['#' + l.id, l.customers?.name, l.start_date, o.principal, o.interest, o.total, l.location, l.pj_no ? '#' + l.pj_no : '-']) };
  if (k === 'ageing') return { sum: 1, cols: ['Loan age', 'Loans', 'Principal', 'Interest', 'Total'], money: [2, 3, 4], rows: [['0-3 months', 0, 3], ['3-6 months', 3, 6], ['6-12 months', 6, 12], ['12+ months', 12, 1e9]].map(([n, a, b]) => {
    const g = live.filter(x => { const m = (nd - D(x.l.start_date)) / 864e5 / 30.44; return m >= a && m < b; });
    return [n, String(g.length), sum(g, x => x.o.principal), sum(g, x => x.o.interest), sum(g, x => x.o.total)]; }) };
  if (k === 'pj') return { sum: 1, cols: ['PJ no.', 'Date', 'Amount', 'Months', 'Interest', 'Linked loans', 'Linked principal'], date: [1], money: [2, 4, 6], rows: pj.map(({ p, m, i }) => { const ls = live.filter(x => x.l.pj_no === p.pj_id); return ['#' + p.pj_id, p.date, +p.amount, String(m), i, String(ls.length), sum(ls, x => x.o.principal)]; }) };
  if (k === 'gold') return { sum: 1, cols: ['Gold at', 'Loans', 'Gross (g)', 'Net (g)', 'Principal'], money: [4], rows: ['shop', 'pj', 'inside'].map(c => { const g = live.filter(x => x.l.location === c); return [c, String(g.length), +sum(g, x => +x.l.gross || 0).toFixed(2), +sum(g, x => +x.l.net || 0).toFixed(2), sum(g, x => x.o.principal)]; }) };
  if (k === 'monthly') { const m = {}, g = y => m[y] ||= [0, 0, 0, 0, 0];
    loans.forEach(l => { if (l.start_date <= d) g(l.start_date.slice(0, 7))[0] += +l.principal_amount;
      l.loan_transactions.forEach(t => { if (t.txn_date > d) return; const e = g(t.txn_date.slice(0, 7)); if (t.txn_type === 'Interest Payment') e[1] += +t.amount; else if (t.txn_type === 'Principal Repayment') e[2] += +t.amount; else if (t.txn_type === 'Top-up') e[0] += +t.amount; });
      if (isClosed(l) && l.closed_date <= d) { const z = settle(l), e = g(l.closed_date.slice(0, 7)); e[1] += z.interest; e[2] += z.principal; } });
    pjs.forEach(p => { if (p.date <= d) g(p.date.slice(0, 7))[3] += +p.amount; if (!isActive(p.status) && p.closed_date && p.closed_date <= d) g(p.closed_date.slice(0, 7))[4] += pjPay(p); });
    return { sum: 1, mon: [0], cols: ['Month', 'Loans given', 'Interest received', 'Principal received', 'PJ funds received', 'PJ paid on release', 'Net cash'], money: [1, 2, 3, 4, 5, 6],
      rows: Object.keys(m).sort().reverse().map(y => [y + '-01', m[y][0], m[y][1], m[y][2], m[y][3], m[y][4], m[y][1] + m[y][2] + m[y][3] - m[y][0] - m[y][4]]) }; }
  if (k === 'customer') { const m = new Map();
    live.forEach(({ l, o }) => { const e = m.get(l.customer_id) || [l.customers?.name, 0, 0, 0, 0]; e[1]++; e[2] += o.principal; e[3] += o.interest; e[4] += o.total; m.set(l.customer_id, e); });
    return { sum: 1, cols: ['Customer', 'Loans', 'Principal', 'Interest', 'Total due'], money: [2, 3, 4], rows: [...m.values()].sort((a, b) => b[4] - a[4]).map(e => [e[0], String(e[1]), e[2], e[3], e[4]]) }; }
  if (k === 'statement') { const ev = [];
    loans.filter(l => String(l.customer_id) === String(cid) && l.start_date <= d).forEach(l => {
      const done = String(l.status).toLowerCase() === 'closed' && l.closed_date && l.closed_date <= d, tx = l.loan_transactions.filter(t => t.txn_date <= d);
      const o = loanOutstanding(done ? l : { ...l, status: 'Active', closed_date: null }, tx, nd);
      ev.push([l.start_date, `Loan #${l.id} given`, +l.principal_amount, 0]);
      o.rows.forEach(r => ev.push([r.date.toLocaleDateString('en-CA'), `Interest #${l.id}${r.running ? ' (running month)' : ''}`, r.interest, 0]));
      tx.forEach(t => ev.push([t.txn_date, `${t.txn_type} #${l.id}`, t.txn_type === 'Top-up' ? +t.amount : 0, t.txn_type === 'Top-up' ? 0 : +t.amount]));
      if (done) ev.push([l.closed_date, `Loan #${l.id} closed: principal + interest received`, 0, Math.max(0, o.total)]); });
    ev.sort((a, b) => a[0].localeCompare(b[0])); let bal = 0;
    return { cols: ['Date', 'Particulars', 'Debit', 'Credit', 'Balance'], money: [2, 3, 4], date: [0], rows: ev.map(([dt, p, dr, cr]) => { bal += dr - cr; return [dt, p, dr, cr, bal]; }) }; }
  if (k === 'spread') { const mi = a => sum(a, x => x.l.interest_rate * x.o.principal / 1200);
    const rows = pj.map(({ p }) => { const ls = live.filter(x => x.l.pj_no === p.pj_id), c = mi(ls), j = +p.amount * PJ_RATE / 12; return ['#' + p.pj_id, +p.amount, sum(ls, x => x.o.principal), c, j, c - j]; });
    const own = live.filter(x => !x.l.pj_no); rows.push(['Own funds (not in PJ)', 0, sum(own, x => x.o.principal), mi(own), 0, mi(own)]);
    return { sum: 1, cols: ['PJ', 'PJ amount', 'Linked principal', 'Customer interest / month', 'PJ interest / month', 'Spread / month'], money: [1, 2, 3, 4, 5], rows }; }
  if (k === 'overdue') return { sum: 1, cols: ['Loan', 'Customer', 'Phone', 'Last interest paid', 'Months', 'Net (g)', 'Gold at', 'Principal', 'Total due'], money: [7, 8], date: [3],
    rows: live.map(({ l, o }) => { const last = l.loan_transactions.filter(t => t.txn_type === 'Interest Payment' && t.txn_date <= d).map(t => t.txn_date).sort().pop() || l.start_date; return { l, o, last, m: (nd - D(last)) / 864e5 / 30.44 }; })
      .filter(x => x.m >= mo).sort((a, b) => b.m - a.m).map(({ l, o, last, m }) => ['#' + l.id, l.customers?.name, l.customers?.phone || '-', last, m.toFixed(1), +(+l.net || 0).toFixed(2), l.location, o.principal, o.total]) };
  const rows = [];
  loans.forEach(l => { const c = l.customers?.name; if (l.start_date === d) rows.push(['Loan given', '#' + l.id, c, 0, +l.principal_amount]);
    l.loan_transactions.filter(t => t.txn_date === d).forEach(t => rows.push([t.txn_type, '#' + l.id, c, t.txn_type === 'Top-up' ? 0 : +t.amount, t.txn_type === 'Top-up' ? +t.amount : 0]));
    if (isClosed(l) && l.closed_date === d) rows.push(['Loan closed: principal + interest received', '#' + l.id, c, settle(l).total, 0]); });
  pjs.forEach(p => { if (p.date === d) rows.push(['PJ funds received', '#' + p.pj_id, 'PJ', +p.amount, 0]); if (!isActive(p.status) && p.closed_date === d) rows.push(['PJ released: principal + interest paid', '#' + p.pj_id, 'PJ', 0, pjPay(p)]); });
  return { sum: 1, cols: ['Entry', 'Loan / PJ', 'Customer', 'Received', 'Paid out'], money: [3, 4], rows };
}
function Table({ rep, rq }) {
  const rows = useMemo(() => rep.rows.filter(r => !rq || r.join(' ').toLowerCase().includes(rq.toLowerCase())), [rep, rq]);
  const [srt, th] = useSort(rows, Object.fromEntries(rep.cols.map((_, i) => [i, r => r[i]])), null);
  const M = i => rep.money.includes(i), cell = (v, i) => typeof v === 'number' && M(i) ? inr(v) : (rep.date || []).includes(i) ? fd(v) : (rep.mon || []).includes(i) ? D(v).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }) : v;
  return <div className="t"><table><thead><tr>{rep.cols.map((c, i) => th(i, c, M(i) ? 'n' : ''))}</tr></thead>
    <tbody>{srt.map((r, j) => <tr key={j}>{r.map((v, i) => <td key={i} className={M(i) ? 'n' : ''}>{cell(v, i)}</td>)}</tr>)}</tbody>
    {rep.sum && <tfoot><tr>{rep.cols.map((c, i) => <td key={i} className={M(i) ? 'n' : ''}>{i === 0 ? 'Total' : M(i) ? inr(sum(srt, r => +r[i] || 0)) : ''}</td>)}</tr></tfoot>}</table></div>;
}
export default function Reports() {
  const [loans, setLoans] = useState(null), [pjs, setPjs] = useState([]), [k, setK] = useState('summary'), [d, setD] = useState(wdate()), [cid, setCid] = useState(''), [mo, setMo] = useState(3), [rq, setRq] = useState('');
  useEffect(() => { Promise.all([cached('loans:full', () => all(() => sb.from('loans').select(FULL).order('id'))), getPJ()]).then(([l, p]) => { setLoans(l); setPjs(p); }).catch(e => toast(e.message, 'err')); }, []);
  const rep = useMemo(() => loans && d ? build(k, d, loans, pjs, cid, mo) : null, [k, d, loans, pjs, cid, mo]);
  const custs = useMemo(() => loans ? [...new Map(loans.map(l => [l.customer_id, l.customers?.name || ''])).entries()].sort((a, b) => a[1].localeCompare(b[1])) : [], [loans]);
  function csv() {
    const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`, a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[rep.cols, ...rep.rows].map(r => r.map(q).join(',')).join('\n')], { type: 'text/csv' })); a.download = `${k}-${d}.csv`; a.click();
  }
  const cell = (v, i) => typeof v === 'number' && rep.money.includes(i) ? inr(v) : v;
  return (<>
    <div className="top"><h1>Reports</h1></div>
    <div className="bar"><label className="grow">Filter rows<input type="search" value={rq} onChange={e => setRq(e.target.value)} /></label><label>As on date<input type="date" value={d} onChange={e => setD(e.target.value)} /></label>
      {k === 'statement' && <label>Customer<select value={cid} onChange={e => setCid(e.target.value)}><option value="">Select…</option>{custs.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select></label>}
      {k === 'overdue' && <label>Months without interest<input type="number" min="1" value={mo} onChange={e => setMo(+e.target.value || 1)} /></label>}
      <button className="ghost" type="button" onClick={() => setD(wdate())}>Use working date</button><button type="button" disabled={!rep} onClick={csv}>Export CSV</button></div>
    <div className="tabs" style={{ marginBottom: 12 }}>{TABS.map(([x, n]) => <button key={x} type="button" className={k === x ? 'on' : ''} onClick={() => setK(x)}>{n}</button>)}</div>
    {!rep ? <div className="empty">Loading…</div> : !rep.rows.length ? <div className="empty">Nothing to show for this date.</div> :
      <Table key={k} rep={rep} rq={rq} />}
    <p className="hint">Figures are calculated as on the selected date. Gold location is the current one. Closed PJ entries without a closed date are left out of every date.</p></>);
}
