# One native network hook readiness

Owner: `p67085 / one-native-ready`. CI and delivery: `p67014`.
Branch: `tm/one-native-network-proof`, based on v2-beta `590121afb`.

Nate, 2026-10-07: "One native should be its own lane yes ... Just making it ready definitely."

RAN controlled React hook runtime before repair: an offline native listener
event changed the hook to `none/false/false`, then a delayed initial read
overwrote it with old `wifi/true/true`. The existing network test fails on
that exact transition. The web hook reads synchronously and has no initial
promise that can overwrite a later event.

The native hook now ignores its initial read after observing a listener
event. It keeps the existing unmount guard and subscription removal. This
adds one boolean per mounted hook and one check on initial-read completion;
the native monitor and public API stay unchanged.

RAN repaired controlled hook and existing network tests: 10 pass. The same
case proves that the listener is removed on unmount. Focused fixture typecheck
and the native conformance runner bundle pass. These checks prove JS ordering,
not live radio changes or a published-package installation.

The existing native network fixture now renders `useNetworkState`, and its
suite compares that state with the native one-shot read on mount and after
two route remounts. Runtime acceptance of those new assertions is pending.
Run app logic through the simulator first; a native iOS oracle is required
for the actual `NWPathMonitor` reading. Reuse an authenticated native shell
when possible and bind the changed One JS, fixture, runner and bundle hashes.
Do not change host connectivity to create a test event.

After the live run and a stale-hook omission control, reconcile the iOS
coverage cell and launch checklist, then land the validated repair on v2-beta.
Android coverage remains with its owner. No One main or stable release.

Further optimization: reuse the network fixture and shell instead of adding
a separate app or native build for a JS-only hook repair.
