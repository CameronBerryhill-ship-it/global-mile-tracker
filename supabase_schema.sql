create extension if not exists pgcrypto;

create table if not exists public.global_mile_tracker_cases (
  id uuid primary key default gen_random_uuid(),
  case_number text,
  container_number text not null,
  chassis_number text not null,
  location text not null,
  repair_description text not null,
  diag_ro_number text,
  repair_ro_number text,
  diag_comp_code text,
  diag_cc_description text,
  diag_cc_hours text,
  repair_comp_code text,
  repair_cc_description text,
  repair_cc_hours text,
  status text not null default 'Pending Shop Availability',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.global_mile_tracker_cases enable row level security;

drop policy if exists "authenticated users can read cases" on public.global_mile_tracker_cases;
create policy "authenticated users can read cases"
on public.global_mile_tracker_cases
for select
to authenticated
using (true);

drop policy if exists "authenticated users can insert cases" on public.global_mile_tracker_cases;
create policy "authenticated users can insert cases"
on public.global_mile_tracker_cases
for insert
to authenticated
with check (true);

drop policy if exists "authenticated users can update cases" on public.global_mile_tracker_cases;
create policy "authenticated users can update cases"
on public.global_mile_tracker_cases
for update
to authenticated
using (true)
with check (true);

drop policy if exists "authenticated users can delete cases" on public.global_mile_tracker_cases;
create policy "authenticated users can delete cases"
on public.global_mile_tracker_cases
for delete
to authenticated
using (true);

alter publication supabase_realtime add table public.global_mile_tracker_cases;
