# One browser service adapters

Status: owner approved landing on v2-beta.
Scope: existing unified browser APIs and the approved Blur/Mask adapters.
Base: origin/v2-beta. Branch: fix/one-unified-browser-apis.

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

The lane stopped while the owner clarified its scope. The worker and branch
name referred to manager-assigned browser adapters for existing One namespaces.
No changes were merged into v2-beta or main.

2026-10-04, Nate: "Ok fine then. The unified APIs I guess are fine but only if they aren’t super complex. What is css effects?"

Continue only the existing unified APIs with simple browser implementations.
No separate browser product or effects system. Review the implementation cost,
especially converting the existing React-element mask prop into a CSS image.
The owner subsequently approved landing, as quoted below.

2026-10-04, Nate: "Ok fine. These are fine to land then. Just I didn’t want coverage of One.UI but these are ok"

Land the existing unified APIs and these Blur/Mask adapters on v2-beta. Broader
One.UI coverage is outside this work. Keep main untouched and keep the current
public API. The owner approval supersedes the unavailable manager review gate.
