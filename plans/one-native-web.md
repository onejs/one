# One browser service adapters

Owner: one-native-web. Assembled review: s9760. Base: origin/v2-beta.

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
