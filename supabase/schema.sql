-- co-fund schema (Supabase Free / Postgres)
-- Run once in the Supabase SQL editor. Trusted office group: app-level
-- name+PIN gate, permissive anon policies (see note at the end).

create extension if not exists "pgcrypto";

-- ---------- members ----------
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'member' check (kind in ('member', 'guest')),
  active boolean not null default true,
  pin text not null default '1234',
  color text not null default '#1E40AF',
  created_at timestamptz not null default now()
);

-- ---------- contributions (money IN, multi-currency via lines) ----------
create table if not exists contributions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  date date not null default current_date,
  note text not null default '',
  by_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists contribution_lines (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid not null references contributions(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null check (currency in ('SYP', 'TRL', 'USD'))
);
create index if not exists contribution_lines_cid on contribution_lines(contribution_id);

-- ---------- expenses (money OUT / meals, multi-currency via lines) ----------
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  member_id uuid references members(id) on delete set null,
  date date not null default current_date,
  description text not null default '',
  parts text not null default '',
  ref text not null default '',
  by_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists expense_lines (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references expenses(id) on delete cascade,
  amount numeric not null check (amount > 0),
  currency text not null check (currency in ('SYP', 'TRL', 'USD'))
);
create index if not exists expense_lines_eid on expense_lines(expense_id);

-- ---------- audit log (footprint: who + what + when) ----------
create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  at text not null default '',
  who text not null default '',
  action text not null default '',
  detail text not null default '',
  ts bigint not null default (extract(epoch from now()) * 1000)::bigint
);
create index if not exists audit_logs_ts on audit_logs(ts desc);

-- ---------- access ----------
-- The app gates access with name+PIN at the UI level (trusted ~10 people,
-- no row-level user identity). Enable RLS with permissive anon policies so
-- the free-tier anon key just works. Tighten later if you ever go public.
alter table members enable row level security;
alter table contributions enable row level security;
alter table contribution_lines enable row level security;
alter table expenses enable row level security;
alter table expense_lines enable row level security;
alter table audit_logs enable row level security;

drop policy if exists "open" on members;
drop policy if exists "open" on contributions;
drop policy if exists "open" on contribution_lines;
drop policy if exists "open" on expenses;
drop policy if exists "open" on expense_lines;
drop policy if exists "open" on audit_logs;

create policy "open" on members for all to anon using (true) with check (true);
create policy "open" on contributions for all to anon using (true) with check (true);
create policy "open" on contribution_lines for all to anon using (true) with check (true);
create policy "open" on expenses for all to anon using (true) with check (true);
create policy "open" on expense_lines for all to anon using (true) with check (true);
create policy "open" on audit_logs for all to anon using (true) with check (true);
