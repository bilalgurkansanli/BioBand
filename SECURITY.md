# Security Policy

## Supported versions

BioBand is a mobile app rather than a library, so only the latest release is
supported. Fixes go into the next release; older versions are not patched.

## Reporting a vulnerability

**Please do not open a public issue.**

Report privately through GitHub's
[Report a vulnerability](https://github.com/bilalgurkansanli/BioBand/security/advisories/new)
form, which creates a draft advisory only the maintainer can see.

Helpful things to include:

- What the issue lets an attacker do
- Steps to reproduce, ideally with the app version and platform
- Whether it needs a signed-in account or works in guest mode

You can expect an acknowledgement within a few days. If the report is valid you
will be credited in the advisory unless you would rather not be.

## What is and is not a secret

BioBand ships these values inside every app binary, by design:

- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Google and Apple OAuth **client IDs**

They are public client-side identifiers. The anon key grants nothing on its own:
access is enforced by Postgres **Row Level Security**, so a signed-in user can
only ever read and write their own row. Finding one of these in the binary or in
a build log is not a vulnerability.

A **`service_role` key would be** a serious one. It bypasses Row Level Security
entirely and must never appear in this repository, in `.env`, in `app.json`, or
in any client code. If you ever find one here, report it through the form above
immediately.

Genuine reports would look more like: a Row Level Security policy that lets one
user read another's data, an auth flow that can be tricked into restoring the
wrong session, or a path that writes files outside the app's own storage.

## Scope

In scope: this repository and the app built from it.

Out of scope: the Supabase and Google platforms themselves (report those to
their own programmes), and issues that need a rooted or jailbroken device with
physical access — the app stores recordings and progress unencrypted in its own
sandbox, which is expected for offline user content.
