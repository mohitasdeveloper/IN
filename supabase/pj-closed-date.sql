-- Run ONCE in the Supabase SQL editor. The app then records the working date when you close a PJ entry.
alter table public.pj add column if not exists closed_date date;
-- Optional: for PJ entries you already closed, set their real closing dates, for example:
-- update public.pj set closed_date = '2026-08-31' where pj_id = 12;
