# Gold Loan Manager: business context and decisions
**Owner:** one user, one PC, own business only. Data stays online in the existing Supabase project (rebuilt from `lists-main.zip`). English only. No ticket or receipt printing.
**Hardware planned (not built):** webcam, barcode/QR scanner, packet label printer.

## Words
- **Loan:** money given to a customer against gold. **Customer interest** is monthly on the principal.
- **PJ:** the one party the owner re-pledges customers' gold to, to receive funds. Fixed rate **15.6% a year**.
- **Gold at:** Shop, PJ or Inside. A loan in a PJ entry is linked by `loans.pj_no`.
- **Working date:** Tally-style date (F2). Default for every entry date and the "as on" date of all figures. Resets to today on a new day.

## Money rules
- Loan created = money **given out**. Loan closed = **principal + interest due that date received**.
- PJ created = money **received**. PJ released = **amount + PJ interest to the release date paid**.
- Top-up = extra money given on an existing loan. Interest and principal payments are stored in `loan_transactions` (`Interest Payment`, `Principal Repayment`, `Top-up`).

## Interest rules (`lib/engine.js`)
- **Customer loan:** rate is yearly, charged monthly (rate/12) on each monthly anniversary of the start date. Each monthly block is charged on the **highest principal held in that block** (pre-payments do not reduce it, top-ups raise it). A top-up dated on the due date starts the next block. The running month is charged in full.
- **PJ:** amount x 15.6%/12 x months. Months = full months, +0.5 if under 15 days into the next month, else +1 (minimum 1).

## Decisions so far
Online Supabase data; single owner login; interest rules unchanged from the old app; PJ is one party at a fixed rate; add a PJ closed date (run `supabase/pj-closed-date.sql`); working date used everywhere; keyboard-first entry; dark/light mode.

## Not built yet (backlog)
PJ interest/principal payment ledger; gold release/custody log when a loan closes; itemised articles, purity and photos; QR labels and scanner; edit/delete of loans, customers and PJ; renewal and part release; audit log; PIN lock; daily backup; lock-date (block old entries); Electron desktop wrapper; automated tests of the engine against real loans.
## Known limits
Gold location history is not stored (reports use the current location). Closed PJ entries with no closed date are left out of past-date reports. Dashboard and loan list only include loans still active today.
