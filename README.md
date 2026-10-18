# Gold Loan Manager (Next.js + Supabase)
Uses your existing Supabase tables as they are. Nothing is migrated or changed in your data.

## Run on your PC
1. Copy `.env.example` to `.env.local`
2. `npm install` then `npm run dev` then open http://localhost:3000 and sign in with your existing Supabase email and password.

## Host on Vercel
1. Upload this folder to a GitHub repo, then Vercel > Add New Project > import it.
2. Add the two variables from `.env.example` under Environment Variables, then Deploy.

## Lock your data (important)
After you can log in, paste `supabase/lock-down.sql` into the Supabase SQL editor and run it once (no editing needed).

## Notes
- Interest rules are in `lib/engine.js`, ported exactly from your old app (PJ rate 15.6% is `PJ_RATE`).
- Statuses are read case-insensitively, so old `active` and new `Active` rows both work.

## Extra SQL
Run `supabase/pj-closed-date.sql` once to add the PJ closed date (the app works without it, but past-date PJ reports are exact only with it).

See `docs/CONTEXT.md` (business rules and decisions) and `docs/STRUCTURE.md` (files, tables, reports).
