-- Run ONCE in the Supabase SQL editor, after you can log in to the new app. No editing needed.
-- It uses the single user found in Authentication > Users (stops with a message if there is not exactly one).
-- Then turn OFF "Allow new users to sign up" in Authentication > Sign In / Providers.
-- Your current policies are "true", which can let anyone holding the public key read and edit all data.
do $$
declare t text; r record; uid uuid; n int;
begin
  select count(*) into n from auth.users;
  if n <> 1 then raise exception 'Expected exactly 1 user in Authentication > Users but found %. Nothing was changed.', n; end if;
  select id into uid from auth.users;
  foreach t in array array['customers','loans','loan_transactions','pj'] loop
    for r in select policyname from pg_policies where schemaname='public' and tablename=t loop
      execute format('drop policy %I on public.%I', r.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy owner_only on public.%I for all to authenticated using (auth.uid() = %L) with check (auth.uid() = %L)', t, uid, uid);
  end loop;
end $$;
