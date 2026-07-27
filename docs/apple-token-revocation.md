# Apple token revocation on account deletion

Apple requires that an app offering Sign in with Apple call their REST revoke
endpoint when a user deletes their account, so BioBand stops appearing under
that user's Apple ID afterwards. Shipping Sign in with Apple without this is a
review rejection.

The code for it is in the repository. These are the steps that need your Apple
key and your Supabase project, and so cannot be done from the repo.

## How it works

Apple's revoke call needs a refresh token belonging to that user, and Supabase
does not keep one. So the token is captured at sign-in and parked in a
service-role-only table until deletion:

| Sign-in path | What Apple gives | What happens |
|---|---|---|
| Native sheet (iOS) | a single-use authorization code, valid minutes | `apple-token` trades it with Apple for a refresh token |
| Browser flow (Android) | `provider_refresh_token`, once, in the session | `apple-token` stores it as-is |

On deletion, `delete-account` revokes the token, then calls the existing
`public.delete_account()` RPC with the user's own JWT. If the revoke fails the
deletion still goes ahead — see the comment at the top of that function for why.

## 1. Create the table

Run [`supabase/apple_tokens.sql`](../supabase/apple_tokens.sql) in the SQL
Editor, as its default `postgres` role. Requires `delete_account.sql` first.

## 2. Set the function secrets

```bash
npx supabase login
npx supabase link --project-ref vsxfyioqfwkilfighbqe

npx supabase secrets set \
  APPLE_TEAM_ID=KW7YB74XT2 \
  APPLE_KEY_ID=<the 10-character Key ID from the Keys page> \
  APPLE_SERVICE_ID=com.bioband.app.web \
  APPLE_BUNDLE_ID=com.bioband.app

# Quoted and read from the file, so the newlines survive.
npx supabase secrets set APPLE_PRIVATE_KEY="$(cat AuthKey_XXXXXXXXXX.p8)"
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are injected
into Edge Functions by Supabase — do not set them yourself.

The `.p8` file never goes in this repository. It is gitignored (`*.p8`), and it
is the one credential that can mint Apple client secrets for this account.

Unlike the client secret pasted into the Apple provider settings, **this one does
not expire every six months**: the functions sign a fresh five-minute secret per
request from the key itself. The key is only invalidated if you revoke it in the
Apple Developer portal.

## 3. Deploy the functions

```bash
npx supabase functions deploy apple-token
npx supabase functions deploy delete-account
```

## 4. Check it

Sign in with Apple on a device, then delete the account from
Profile → Settings. In the Supabase dashboard under Edge Functions → Logs,
`delete-account` should report `"apple":"revoked"`.

- `"nothing_to_revoke"` — no token was stored for that user. Expected for a
  Google-only account; for an Apple account it means `apple-token` did not run
  or failed, so check its logs.
- `"revoke_failed"` — Apple refused, or the secrets are missing or wrong. The
  account is still deleted; the reason is in the logs.

Confirm at the user's end too: on an iPhone, Settings → your name → Sign in with
Apple should no longer list BioBand.

## If the functions are not deployed

The app falls back to calling `delete_account()` directly. Deletion keeps
working, but nothing is revoked at Apple's end — which is exactly the state that
gets an App Store submission rejected.
