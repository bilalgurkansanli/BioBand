# Delete your BioBand account

**App:** BioBand (`com.bioband.app`)
**Developer:** Bilal Gürkan Şanlı
**Contact:** bilalsanli129@gmail.com
**Last updated: July 26, 2026**

This page explains how to delete your BioBand account and the data stored under
it. You do not need the app installed to make the request.

If you only ever used BioBand as a guest, you have no account and there is
nothing to delete — guest mode never sends anything off the device, and closing
the app already resets it to a fresh state.

## Option 1 — delete it yourself in the app

1. Open BioBand and make sure you are signed in.
2. Go to **Profile → Settings**.
3. Choose **Delete account** and confirm.

The deletion happens immediately and cannot be undone. The app also wipes the
copy of your data held on that device and returns to guest mode.

## Option 2 — request deletion by e-mail

Send an e-mail to **bilalsanli129@gmail.com** with the subject
**"Delete my BioBand account"**, and include:

- which sign-in method you used — **Google** or **Sign in with Apple**, and
- the e-mail address on the account.

If you signed in with Apple and chose **Hide My Email**, the address on your
account is the `…@privaterelay.appleid.com` one Apple created for BioBand
rather than your personal address. You can find it in the app under
**Profile → Settings**, or in your Apple ID settings under *Sign in with Apple*.
Mention that you used Hide My Email and we will work it out with you.

We reply to the address on the account to confirm the request before deleting
anything, so that nobody else can delete your account on your behalf.

## What is deleted

Everything BioBand holds for you server-side:

- **Your practice data** — practice streaks, total practice time, completed
  challenges, earned badges, and the feature counters described in the
  [privacy policy](https://github.com/bilalgurkansanli/BioBand/blob/main/PRIVACY.md).
- **Your profile settings** — display name, favorite instrument, profile photo
  URL.
- **Your practice-reminder preference.**
- **The account itself** — the account record and e-mail address held by our
  cloud database, together with the sign-in identities, sessions and refresh
  tokens attached to it. After this, signing in with the same Google or Apple
  account creates a brand-new, empty BioBand account.

If you delete from inside the app, the local copy on that device is wiped in the
same step.

## What is *not* deleted, because it was never uploaded

Your recordings, Studio projects, imported songs and any audio you create or
import stay on your device and are never sent to us. Deleting your account does
not touch them. To remove those, delete them in the app or uninstall it.

Deleting your BioBand account also does not affect your Google or Apple account
itself — only BioBand's link to it.

## What is retained, and for how long

- **Nothing is retained in the live database.** Both the account record and your
  practice/settings data are removed outright, not flagged as deleted.
- **Encrypted database backups** taken by our hosting provider before the
  deletion may still contain a copy until they expire on that provider's normal
  rotation, a matter of days. They exist only for disaster recovery and are
  never used to restore a deleted account.
- **Your deletion request e-mail**, if you use Option 2, is kept only until the
  request has been carried out and confirmed to you, and is deleted within 30
  days of that.

## How long it takes

In-app deletion is immediate. E-mailed requests are usually handled within a few
days and always within 30 days of the request being confirmed.

## Related

- [BioBand privacy policy](https://github.com/bilalgurkansanli/BioBand/blob/main/PRIVACY.md)
