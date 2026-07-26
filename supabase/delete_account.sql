-- BioBand account deletion.
-- Run this once in your Supabase project's SQL Editor, after schema.sql.
-- Required by App Store guideline 5.1.1(v) and Google Play's user-data policy:
-- an app that lets people create an account must let them delete it in-app.
--
-- Why the privilege lives here instead of in the app:
-- removing a row from `auth.users` needs rights no mobile client may ever hold.
-- A `service_role` key shipped inside the binary is readable by anyone who
-- downloads the app, and would hand every user the ability to delete every
-- other user. So the privilege stays in the database, wrapped in a function
-- that can only ever act on the caller who invoked it.
--
-- What keeps that safe:
--   * The function takes no arguments. There is no user id for a client to
--     tamper with — the target is always `auth.uid()`.
--   * `auth.uid()` is read from the JWT PostgREST already verified against the
--     project's JWT secret. Forging one means holding that secret, which never
--     leaves the server.
--   * EXECUTE is granted to `authenticated` only, so the anon key alone (no
--     signed-in user) cannot call it at all.
--   * `set search_path = ''` forces every reference below to be schema
--     qualified, so a caller cannot plant their own `app_data` or `uid()`
--     earlier in the path and have the definer's privileges run it.
--
-- What it clears (public.app_data is the only table the client ever writes —
-- see src/supabase/appDataSync.ts):
--   * public.app_data — profile_progress, profile_settings, practice_reminder
--   * auth.users     — the account itself. Supabase's own foreign keys cascade
--                      from here into auth.identities, auth.sessions,
--                      auth.refresh_tokens and auth.mfa_factors.
-- Recordings, Studio projects and audio files are never uploaded (see
-- supabase/schema.sql), so nothing else exists server-side; the app wipes those
-- from the device itself once this function reports success.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller uuid := auth.uid();
begin
  if caller is null then
    -- 28000 = invalid_authorization_specification, which PostgREST returns as
    -- HTTP 403 so the app can tell "session gone" apart from "server error".
    raise exception 'delete_account requires an authenticated caller'
      using errcode = '28000';
  end if;

  -- Spelled out rather than left to app_data's `on delete cascade`: it states
  -- the blast radius next to the grant, and survives a later schema change
  -- that drops the cascade.
  delete from public.app_data where user_id = caller;
  delete from auth.users where id = caller;
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;

-- Run this in the SQL Editor as its default `postgres` role. A migration
-- applied by a lesser role will create a function that cannot touch
-- auth.users, which shows up at runtime as "permission denied for table users".
