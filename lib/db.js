import { createClient } from '@supabase/supabase-js';
export const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
export const inr = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n || 0);
export const fd = s => (s ? new Date(s + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-');
export const today = () => new Date().toLocaleDateString('en-CA');
export const isActive = s => String(s).toLowerCase() === 'active';
// Supabase returns max 1000 rows per request, so page through everything.
export async function all(q) {
  let out = [], i = 0;
  for (;;) { const { data, error } = await q().range(i, i + 999); if (error) throw error; out = out.concat(data); if (data.length < 1000) return out; i += 1000; }
}
export const toast = (m, type = 'ok') => window.dispatchEvent(new CustomEvent('toast', { detail: { m, type } }));
// Small in-memory cache: one request per dataset, shared across pages; call bust() after writes.
const C = new Map();
export function cached(key, fn, ttl = 60000) {
  const h = C.get(key); if (h && Date.now() - h.t < ttl) return h.p;
  const p = fn().catch(e => { C.delete(key); throw e; }); C.set(key, { t: Date.now(), p }); return p;
}
export const bust = (...ps) => { for (const k of [...C.keys()]) if (ps.some(p => k.startsWith(p))) C.delete(k); };
export const LOAN_SEL = 'id,customer_id,principal_amount,interest_rate,start_date,status,closed_date,location,pj_no,customers(name)';
// Active loans come with their payments in the same request; closed loans are fetched only when asked for.
export const getLoans = kind => cached('loans:' + kind, () => all(() => {
  const q = sb.from('loans').select(kind === 'active' ? LOAN_SEL + ',loan_transactions(loan_id,txn_date,txn_type,amount)' : LOAN_SEL).order('id', { ascending: false });
  return kind === 'active' ? q.ilike('status', 'active') : q.not('status', 'ilike', 'active');
}));
export const getPJ = () => cached('pj:all', async () => { // works before and after the closed_date column is added
  try { return await all(() => sb.from('pj').select('pj_id,date,amount,net,status,closed_date').order('pj_id', { ascending: false })); }
  catch (e) { return all(() => sb.from('pj').select('pj_id,date,amount,net,status').order('pj_id', { ascending: false })); } });
export const pjLive = (p, d) => p.date <= d && (isActive(p.status) || (!!p.closed_date && p.closed_date > d));
export const getCustomers = () => cached('customers', () => all(() => sb.from('customers').select('id,name,phone,address').order('name')));
// Working date (like Tally's current date): default for every entry date. Resets to today on a new day.
export const wdate = () => { try { const o = JSON.parse(localStorage.getItem('wd')); if (o && o.on === today()) return o.d; } catch (e) {} return today(); };
export const setW = d => { try { localStorage.setItem('wd', JSON.stringify({ d, on: today() })); } catch (e) {} };
