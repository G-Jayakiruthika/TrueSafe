-- TrueSafe schema with Row Level Security. Run in Supabase SQL editor (or `supabase db push`).
-- Public anon key is safe ONLY because every table has RLS enabled + FORCE and owner-only policies.

create extension if not exists pgcrypto;

-- Users authenticate via Supabase Auth (phone OTP); profiles.id = auth.uid().
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  phone_hash  text not null,                -- never store raw phone (data minimisation)
  pwd_hash    text,                         -- optional fallback password: Argon2id hash produced by the API only
  role        text not null default 'user' check (role in ('user')),
  created_at  timestamptz not null default now()
);

create table if not exists public.scans (
  id             bigint generated always as identity primary key,
  user_id        uuid not null references public.profiles(id) on delete cascade,
  classification text not null check (classification in ('SCAM','CIVIC_ISSUE','SAFE')),
  risk_score     int  not null check (risk_score between 0 and 100),
  redacted_text  text not null check (char_length(redacted_text) <= 4000), -- PII already redacted
  lang           text not null default 'en' check (lang in ('en','ta','hi')),
  created_at     timestamptz not null default now()
);
create index if not exists scans_user_idx on public.scans(user_id, created_at desc);

create table if not exists public.family_links (
  id          bigint generated always as identity primary key,
  owner_id    uuid not null references public.profiles(id) on delete cascade,  -- smartphone user
  member_name text not null check (char_length(member_name) <= 80),
  relation    text not null check (char_length(relation) <= 40),
  created_at  timestamptz not null default now()
);

create table if not exists public.consents (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  purpose    text not null check (purpose in ('terms','privacy','cookies_analytics')),
  granted    boolean not null,
  created_at timestamptz not null default now()
);

-- ---- RLS on ALL tables, forced even for table owners ----
alter table public.profiles     enable row level security;  alter table public.profiles     force row level security;
alter table public.scans        enable row level security;  alter table public.scans        force row level security;
alter table public.family_links enable row level security;  alter table public.family_links force row level security;
alter table public.consents     enable row level security;  alter table public.consents     force row level security;

-- Default deny for anon; authenticated users only touch their own rows (tenant isolation).
revoke all on all tables in schema public from anon;
revoke all on all tables in schema public from public;

create policy profiles_select_own on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_update_own on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy profiles_delete_own on public.profiles for delete to authenticated using (id = auth.uid());

create policy scans_select_own on public.scans for select to authenticated using (user_id = auth.uid());
create policy scans_insert_own on public.scans for insert to authenticated with check (user_id = auth.uid());
create policy scans_delete_own on public.scans for delete to authenticated using (user_id = auth.uid());

create policy family_select_own on public.family_links for select to authenticated using (owner_id = auth.uid());
create policy family_insert_own on public.family_links for insert to authenticated with check (owner_id = auth.uid());
create policy family_delete_own on public.family_links for delete to authenticated using (owner_id = auth.uid());

create policy consents_select_own on public.consents for select to authenticated using (user_id = auth.uid());
create policy consents_insert_own on public.consents for insert to authenticated with check (user_id = auth.uid());

-- Column-level lock against mass assignment: clients may only write listed columns.
revoke insert, update on public.profiles from authenticated;
grant select, delete on public.profiles to authenticated;
grant update (phone_hash) on public.profiles to authenticated;
grant select, insert, delete on public.scans, public.family_links to authenticated;
grant select, insert on public.consents to authenticated;
grant usage on all sequences in schema public to authenticated;

-- ---- Argon2id for fallback passwords ----
-- Hashing happens in the Node API (argon2id, m=19456KiB, t=2, p=1) and only the encoded hash is stored in pwd_hash.
-- pgcrypto has no Argon2; do NOT use crypt()/md5/sha for passwords. Block direct writes of pwd_hash:
create or replace function public.reject_non_argon2id() returns trigger language plpgsql as $$
begin
  if new.pwd_hash is not null and new.pwd_hash !~ '^\$argon2id\$' then
    raise exception 'pwd_hash must be an argon2id hash';
  end if;
  return new;
end $$;
drop trigger if exists profiles_argon2id_only on public.profiles;
create trigger profiles_argon2id_only before insert or update on public.profiles
  for each row execute function public.reject_non_argon2id();

-- ---- Right to erasure: one-call deletion of all user data ----
create or replace function public.delete_my_data() returns void
language sql security definer set search_path = public as $$
  delete from public.profiles where id = auth.uid();   -- cascades to every dependent table
$$;
revoke all on function public.delete_my_data() from public, anon;
grant execute on function public.delete_my_data() to authenticated;
