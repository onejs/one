# One starter validation

The refreshed starter lives on `v2-beta-starter`, forked from `v2-beta`.
It carries Takeout's Orez Lite application stack and shared web/native social app.
The canonical template is `templates/one-starter`; create-one selects it by default.
The starter is intentionally outside the framework beta branch until approved.

## Stack

- One and vxrn: `2.0.0-beta.161.1`.
- Tamagui: `3.0.0-beta.1540.1`.
- Orez Lite: `0.16.19-canary.1790768320875`.
- Better Auth: `1.6.30`.
- One shared SQLite application database for auth, application data and sync.
- Node production server, email OTP, authenticated uploads and server mutations.

Takeout's `tm/contrast-stack-example` at `42b8038d` supplied the application
structure. Its MIT license is preserved. Duplicate infrastructure and the
PostgreSQL stack were removed during assembly.

## Validation

TESTED: a fresh app was generated through create-one, dependencies installed,
and the implicit default selected the Takeout-derived template. Web exercised
demo login, email OTP signup, feed, comments, image upload, post creation, profile
editing, sign-out and renewed sign-in. SQLite reads and reloads checked persistence.
Browser page errors were empty.

TESTED: the production Node server exercised email delivery failure, disabled
password/demo signup, authenticated upload, sync permissions and mutation limits.
A second account checked ownership and notification cleanup. External email and
object storage were replaced by local servers during validation.

RAN: typecheck and lint passed. Lint reports 30 existing warnings and zero errors.

TESTED: the compiled fresh iOS app on a standard iPhone 17 Pro running iOS 27
exercised logged-out launch, demo sign-in, populated feed, signed-in cold restore,
profile/settings, sign-out, logged-out cold restore and renewed sign-in. A temporary
in-app probe invoked the starter's actual auth functions and observed route, data
and session state. The probe was removed after validation.

RAN: the published packages were inspected by content. vxrn captures and appends
extra Babel plugins; the compiler disables input source maps for its native pass.
The validation used published dependencies without editing their built files.

## Native corrections

The page scroll primitives now allow automatic iOS content inset adjustment under
native tabs. Captures show the Feed title above the first card and the card header
below the status bar. Profile content remains clear of the native settings control.

The auth client clears the session atom before navigation on sign-out. Sign-in
waits for an authoritative settled response from the current session generation.
Demo and OTP confirmation errors preserve their result contracts, and every logout
entry uses the existing error toast. Native traces showed logged-out state before
the login redirect, with no logged-in bounce. This required no One routing change.

## Review and disposition

The assembled starter received an Opus review. The later session-state correction
received a separate assigned review before implementation; its findings were fixed.
The starter is ready for review on its branch. Framework beta releases do not carry
this new starter until the branch is approved and landed.
