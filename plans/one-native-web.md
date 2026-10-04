# One browser service adapters

Status: stopped by owner. Worker: one-native-web. Base: origin/v2-beta.

Nate's scope, 2026-10-04: "We already have enough just making all the native APIs work!!!!!! Plus some unification. Why are you adding now random features?????" and "It's meant to be clean and simple."

Implement the existing root namespace methods with browser APIs and keep their
signatures. No npm dependencies or native source changes. Browser effects use
CSS rather than native components. Each operation must either perform the work
or preserve its documented unavailable contract.

The browser has no PDF printing completion result, magnetic field vector,
OS audio interruption event, background location guarantee, geocoder, or
address-book search/edit interface. Those methods stay unavailable individually.
OPFS private addresses are not fetchable resource URLs; image transforms and
recordings return browser blob URLs instead.

Evidence: `tests/native-features/evidence/one-native-web/README.md`.

## Owner correction

2026-10-04, Nate: "I don’t want one native web. That’s literally something I said never should exist. What even is that"

Stop this browser implementation lane. No landing or release is authorized.
The existing pushed branch is retained for audit; it has not been merged into
v2-beta or main. The worker and branch name referred to the manager-assigned
browser adapters for existing One namespaces, not a separate package.
