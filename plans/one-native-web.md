# One browser service adapters

Status: owner approved landing on v2-beta.
Scope: existing unified browser APIs and the approved Blur/Mask adapters.
Base: origin/v2-beta. Branch: fix/one-unified-browser-apis.

Scope (2026-10-04): make the existing native APIs work plus some unification, kept clean and simple; no new features.

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

2026-10-04: the owner does not want a separate One native web product.

The lane stopped while the owner clarified its scope. The worker and branch
name referred to manager-assigned browser adapters for existing One namespaces.
No changes were merged into v2-beta or main.

2026-10-04: the existing unified APIs are acceptable only if they stay simple.

Continue only the existing unified APIs with simple browser implementations.
No separate browser product or effects system. Review the implementation cost,
especially converting the existing React-element mask prop into a CSS image.
The owner subsequently approved landing.

2026-10-04: these adapters are approved to land; broader One.UI coverage was not wanted.

Land the existing unified APIs and these Blur/Mask adapters on v2-beta. Broader
One.UI coverage is outside this work. Keep main untouched and keep the current
public API. The owner approval supersedes the unavailable manager review gate.

## Browser URL validation follow-up

2026-10-04: m20266 approved a bounded parity repair after reviewing both entries
and fresh runtime evidence. The approved browser implementation is already on
v2-beta at `3d5841af0`; the saved unified branch adds only completion receipts.
The native API v2 branch is already an ancestor, so no branch adoption is needed.

RAN: web `Browser.mayLaunchUrl` accepted empty and non-string URLs while native
rejected them synchronously before creating its Nitro object. The web entry now
reuses the same validator. Valid hints still resolve `false`, with no popup.
TESTED: original web cases fail the new regression assertions; native cases pass.
All 172 focused browser, SSR, docs and effects tests pass after repair. Chromium
and WebKit verify synchronous rejection, no popup from launch hints or unavailable
auth sessions, and real popup opening with a cleared opener. Native behavior,
exports, signatures and dependencies are unchanged. There is no per-frame work;
the added check is one type/length validation per hint. Physical native runtime
and downstream package adoption are outside this web-only repair.
