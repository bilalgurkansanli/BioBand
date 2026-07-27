-- Storage for the one Apple token BioBand is required to hold on to.
-- Run this once in your Supabase project's SQL Editor, after delete_account.sql.
--
-- Why this table has to exist at all:
-- Apple requires that an app offering Sign in with Apple call their REST
-- revoke endpoint when a user deletes their account, so the account stops
-- appearing under the user's Apple ID afterwards. That call needs a refresh
-- token belonging to that user, and Supabase does not keep one:
--   * the web/OAuth flow (Android) hands `provider_refresh_token` back once,
--     in the session at sign-in, and never again;
--   * the native flow (iOS) never produces one at all — Apple gives an
--     authorization code that has to be exchanged server-side, within minutes.
-- So the token is captured at sign-in and parked here until it is needed.
--
-- `client_id` travels with the token because the two sign-in paths are issued
-- to different Apple clients — the Services ID on the web, the bundle ID
-- natively — and Apple rejects a revoke whose client does not match the one
-- the token was minted for.
--
-- What keeps it safe:
--   * RLS is on and there is not a single policy, so PostgREST exposes nothing
--     to `anon` or `authenticated`. Only `service_role`, which bypasses RLS and
--     never leaves the Edge Functions, can read or write it.
--   * The grants are revoked as well, so the table is unreachable even if a
--     policy is ever added here by accident.
--   * `on delete cascade` means the row cannot outlive the account it belongs
--     to — including when delete_account() removes the user directly.

create table if not exists public.apple_refresh_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  refresh_token text not null,
  -- Services ID for the browser flow, bundle ID for the native sheet.
  client_id text not null,
  updated_at timestamptz not null default now()
);

alter table public.apple_refresh_tokens enable row level security;

-- Deliberately no policies: with RLS enabled and none defined, every request
-- carrying a user's JWT is denied. This is the whole access model, not an
-- oversight — do not add a policy here.

revoke all on table public.apple_refresh_tokens from anon, authenticated;

comment on table public.apple_refresh_tokens is
  'Apple refresh tokens held solely to revoke them on account deletion. '
  'Service-role only; see supabase/functions/delete-account.';
