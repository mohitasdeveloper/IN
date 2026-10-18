// Interest engine: exact port of the original rules.
export const PJ_RATE = 0.156; // 15.6% a year
const d0 = s => { const [y, m, d] = s.split('-'); return new Date(y, m - 1, d); };

// PJ months: full months, +0.5 if under 15 days into the next month, else +1.
export function pjMonths(s, now = new Date()) {
  const st = d0(s), t = new Date(now); t.setHours(0, 0, 0, 0);
  if (st > t) return 0; if (+st === +t) return 1;
  let m = (t.getFullYear() - st.getFullYear()) * 12 + t.getMonth() - st.getMonth();
  if (t.getDate() < st.getDate()) m--;
  const tmp = new Date(st); tmp.setMonth(tmp.getMonth() + m);
  const days = Math.ceil(Math.abs(t - tmp) / 864e5);
  if (m <= 0) return 1; return days < 15 ? m + 0.5 : m + 1;
}
export const pjInterest = (p, now = new Date()) => +p.amount * PJ_RATE / 12 * pjMonths(p.date, now);

// Customer loan: interest is charged on each monthly anniversary on the HIGHEST principal held during that
// monthly block. A pre-payment inside the block does not reduce that block's interest; a top-up inside the
// block raises it. A top-up dated on the due date itself starts the next block. The running month is charged in full.
export function loanOutstanding(loan, all, now = new Date()) {
  const tx = all.filter(t => t.loan_id === loan.id).sort((a, b) => d0(a.txn_date) - d0(b.txn_date));
  const closed = String(loan.status).toLowerCase() === 'closed';
  const rate = loan.interest_rate / 100 / 12, start = d0(loan.start_date);
  const end = closed && loan.closed_date ? d0(loan.closed_date) : new Date(now);
  end.setHours(23, 59, 59, 999);
  const due = n => { const x = new Date(start); x.setMonth(start.getMonth() + n); if (x.getDate() !== start.getDate()) x.setDate(0); x.setHours(0, 0, 0, 0); return x; };
  let p = +loan.principal_amount, accrued = 0, paidI = 0, i = 0, n = 1, last = start; const rows = [];
  const apply = t => { const a = +t.amount; if (t.txn_type === 'Interest Payment') paidI += a; else if (t.txn_type === 'Principal Repayment') p -= a; else if (t.txn_type === 'Top-up') p += a; };
  for (;; n++) {
    const dd = due(n); if (dd > end) break;
    last = dd; let hi = p;
    while (i < tx.length && d0(tx[i].txn_date) <= dd) { const t = tx[i++]; apply(t); if (!(t.txn_type === 'Top-up' && +d0(t.txn_date) === +dd)) hi = Math.max(hi, p); }
    const int = hi * rate; accrued += int; rows.push({ date: dd, principal: hi, interest: int });
  }
  if (!closed && end > last) { let hi = p; while (i < tx.length) { apply(tx[i++]); hi = Math.max(hi, p); } const int = hi * rate; accrued += int; rows.push({ date: due(n), principal: hi, interest: int, running: true }); }
  while (i < tx.length) apply(tx[i++]);
  return { principal: p, interest: accrued - paidI, total: p + accrued - paidI, rows };
}

// Outstanding for an active loan as on date d (YYYY-MM-DD); null if it had not started yet.
export function asOn(l, d) { if (l.start_date > d) return null; return loanOutstanding(l, (l.loan_transactions || []).filter(t => t.txn_date <= d), new Date(d + 'T00:00')); }
