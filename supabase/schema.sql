-- BioBand cloud sync schema.
-- Run this once in your Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query).
--
-- Scope: only small JSON (profile progress, profile settings, practice
-- reminder config) is synced to the cloud. Recordings/Studio projects/audio
-- files stay device-local — this keeps the app comfortably within Supabase's
-- free tier (500 MB DB is enormous for this row shape; no Storage bucket
-- needed at all).

create table if not exists public.app_data (
  user_id uuid primary key references auth.users (id) on delete cascade,
  profile_progress jsonb not null default '{}'::jsonb,
  profile_settings jsonb not null default '{}'::jsonb,
  practice_reminder jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.app_data enable row level security;

create policy "Users can read their own app data"
  on public.app_data for select
  using (auth.uid() = user_id);

create policy "Users can insert their own app data"
  on public.app_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own app data"
  on public.app_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Keeps `updated_at` accurate on every upsert from the client.
create or replace function public.set_app_data_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists app_data_set_updated_at on public.app_data;
create trigger app_data_set_updated_at
  before update on public.app_data
  for each row
  execute function public.set_app_data_updated_at();
