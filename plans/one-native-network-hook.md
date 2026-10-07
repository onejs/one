# One native network hook readiness

Owner: `p67085 / one-native-ready`. CI and delivery: `p67014`.
Landing branch: `tm/one-native-network-ready`, based on rewritten v2-beta
`2611d1957`. Original proof branch: `tm/one-native-network-proof`.

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
two route remounts. Runtime acceptance is recorded below.
Run app logic through the simulator first; a native iOS oracle is required
for the actual `NWPathMonitor` reading. Reuse an authenticated native shell
when possible and bind the changed One JS, fixture, runner and bundle hashes.
Do not change host connectivity to create a test event.

The live run and stale-hook omission control now pass their intended verdicts.
The iOS coverage cell and launch checklist are reconciled for v2-beta landing.
Android coverage remains with its owner. No One main or stable release.

Further optimization: reuse the network fixture and shell instead of adding
a separate app or native build for a JS-only hook repair.

## Runtime checkpoint, 2026-10-07

RAN worker `e0ea79f4f`: Peach 0.1.1315 passes the original fixture on mount
and two route remounts with State and Hook `unknown/true/true`, Events 1.
That is simulated state, not an `NWPathMonitor` reading.

The unchanged iOS 27 network suite fails its existing first-listener assertion:
State and Hook are `ethernet/true/true`, Events 0. It stops before hook
agreement, refresh and native remount assertions. The omitted-hook control
was not run. This is a failed native acceptance, not a closed coverage gap.
Canonical fixture bytes and source-bound hook JS are recorded in
`/Users/n8/Library/Logs/one-network-hook-proof/ios-canonical/identity.json`.
The native shell identity and original-build-source limit remain explicit.

GUESSED by the worker: the hook's first subscription consumes the initial
path before the fixture's second listener attaches. Parent owns a registration
and callback trace on the same binary to distinguish that ordering from
another listener defect. No timeout, retry or assertion change is authorized
to obtain a pass.

## Listener precondition repair, 2026-10-07

RAN parent registration/callback trace on the same reused native shell: the
original hook-first fixture passes initial agreement, then fails recycle 1
with State and Hook `ethernet/true/true` and Events 0. Its hook callbacks fire;
the later event-counting subscriber receives none. The local deduplicated
trace is `/Users/n8/Library/Logs/one-network-hook-proof/parent-trace/`.
The callback timestamps describe JS delivery, not native emission time.

INFERRED from that trace and `HybridOneNetwork.swift`: the existing monitor
starts with the first subscriber and does not replay its first path to later
subscribers. Adding the hook before the fixture's effect changed the original
first-listener precondition. A trace showing the event-counting subscriber
registered first and still missing its event would challenge this diagnosis.

The fixture now registers its event-counting effect before calling the hook.
The hook still runs unconditionally on every render. Every runner assertion
and its timeout stays unchanged; the native subscription behavior stays
unchanged. RAN the package's Vitest network script: 10 pass. Focused fixture
types pass. The canonical acceptance and omission control follow below.

## Native acceptance, 2026-10-07

RAN parent uninstrumented canonical fixture, omitted-hook control, then restored
canonical fixture on the same standard iPhone 17 Pro/iOS 27.0 build 24A434:
exit 0, exit 1, exit 0. Both canonical runs pass listener delivery, hook/state
agreement, refresh and two route remounts. The omission control retains the
first-listener precondition and reaches Events 2 with native State
`ethernet/true/true`, then rejects Hook `unknown/false/false` at the agreement
assertion. No assertion, timeout, retry or host connectivity was changed.

Receipt: `/Users/n8/Library/Logs/one-network-hook-proof/parent-controls/`. Each run
records source commit `7d8666b1d`, fixture, runner, source-bound emitted JS,
JS/Hermes bundle and native executable/debug dylib hashes. The unchanged
native executable is `318da9592123f5820a0bb158e4ba31d22b97d0851b043c8484c41519aeb2021e`.
Its original native build source is not newly authenticated to this HEAD.
This proves workspace hook behavior against that reused native shell; it does
not prove the current npm package, production app, Android, or a live radio
transition. The controlled React test covers the delayed initial-read race.

Parent stopped the owned dev server and native app, shut down the simulator
and released its claim. Background service restoration remains pending next
boot under the existing `t-muynwdyz-ci30` defect. Full bundles/captures remain
outside git in `/Users/n8/Library/Logs/one-network-hook-proof/`.

## Landing after history reconciliation

RAN fetch on the public repository: origin/v2-beta `2611d1957` has rewritten
history and no merge base with primary `aebf8c721`; its proof guard rejects
tracked `tests/native-features/proofs`. The shared primary is preserved.
The already validated source, fixture, runner, tests and coverage/docs changes
are adopted onto a fresh managed worktree from the current v2-beta. Captures,
logs, receipts and probe scripts remain outside this landing commit. The
original proof branch is retained as a historical save point, not merged.
Delivery owner `p67014` has the primary reconciliation blocker.
