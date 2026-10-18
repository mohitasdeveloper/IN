# Structure
Next.js (App Router, JavaScript) + Supabase. Deploy on Vercel. Env: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (see `.env.example`).

## Files
- `app/layout.js` root, theme script. `app/globals.css` all styles (light/dark variables).
- `app/page.js` Dashboard. `app/loans/page.js` loan list (sort, filters, clickable rows). `app/loans/new/page.js` new loan. `app/loans/[id]/page.js` loan ledger, payments, top-up, close.
- `app/customers/page.js` customers. `app/pj/page.js` PJ list and create. `app/reports/page.js` reports.
- `components/Shell.js` login, menu, working date (F2), theme, keyboard shortcuts, toasts. `components/Sortable.js` `useSort` for sortable headers.
- `lib/db.js` Supabase client, formatting, 60-second cache (`cached`, `bust`), shared fetchers (`getLoans`, `getPJ`, `getCustomers`), working date (`wdate`, `setW`), `pjLive`.
- `lib/engine.js` interest engine: `loanOutstanding`, `asOn`, `pjMonths`, `pjInterest`, `PJ_RATE`.
- `supabase/lock-down.sql` (security rules, run once), `supabase/pj-closed-date.sql` (adds `pj.closed_date`).

## Tables (existing)
`customers(id, name, phone, address, created_at)`; `loans(id, customer_id, principal_amount, interest_rate, start_date, status, closed_date, articles, gross, net, location, pj_no)`; `loan_transactions(id, loan_id, txn_date, txn_type, amount, note)`; `pj(pj_id, date, net, amount, status, closed_date)`. Status values are read case-insensitively (`active`/`Active`, `closed`/`Closed`).

## API use
Active loans come with their payments in one request (embedded `loan_transactions`); closed loans load on demand; lists share cached data and refresh after writes.

## Reports (all "as on" a date, CSV export, sortable, row filter)
Summary, Loan register, Ageing, PJ register, Gold stock, Day book (loan given, payments, closures, PJ received and released), Monthly collections (cash in and out by month), Customer ledger, Customer statement (debit, credit, balance), Spread (customer interest vs PJ interest per month), Overdue list (months without interest).

## Shortcuts
F2 working date; n new entry; / search; g then d/l/c/p/r go to pages; ? help; Esc close; arrows move between loan rows.
