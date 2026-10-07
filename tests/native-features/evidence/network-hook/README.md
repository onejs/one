RAN: the unchanged iOS network conformance suite rejected the canonical fixture
at `the listener fires at least once`. Its retained accessibility snapshot and
native screenshot show `State: ethernet true true`, `Hook: ethernet true true`,
and `Events: 0`. The expected differing observation is an Events count of at
least one. Hook/native agreement is visible on this mount, but the suite did
not reach its hook gate or either native remount. No omitted-hook control ran:
the assignment required returning a canonical assertion failure to the parent.
No timeouts, assertions, retries, or skips were changed.

RAN: Peach rendered the original fixture and matched its hook and simulated
network state on mount and two route remounts. Every receipt is
`unknown true true`, with `Events: 1`. This is Peach app logic evidence, not
an iOS NWPathMonitor observation. No controlled native event order or hardware
disconnect was exercised. Host connectivity was unchanged.

The iOS oracle was the standard iPhone 17 Pro A9BF26C8-2214-4DC6-AA9E-877B19A49FE9,
iOS 27.0 build 24A434. OneBasic was reused from the authenticated p67471 artifact,
originally copied from pro-64 device 0FC55879-D544-420F-8BBD-521C9268E14A. It was
not rebuilt or attributed to current source HEAD. Executable and debug dylib
hashes match the installed app; see installed-native-hashes.json.

The scratch Vite binding plugin replaces the primary network dist module with
transpiled worktree source. It leaves the other installed dependencies in place.
The source hash, original primary dist hash, transpiled hash, fixture and runner
hashes, JS and Hermes bundle hashes are in ios-canonical/identity.json.
bundle-network-hook.js is the emitted useNetworkState function with its
`active && !sawEvent` guard. The canonical fixture copy remained byte-identical
to source throughout the rejected run and was verified before scratch removal.
The runner source was unchanged. run-controls.ts preserves the attempted sequence;
it stopped after its first canonical failure. stdout and stderr shared one Bun
file target, so final stderr overwrote some earlier PASS lines; the retained
snapshot, screenshot and exit code establish the rejection.

GUESSED: the fixture's second subscription may attach after the monitor's first
path has already reached the hook's subscription. This hypothesis comes from
the fixture mounting the hook before adding its own listener, the Swift monitor
starting only for the first listener, and the Events: 0 observation. A listener
registration/path delivery trace would distinguish this from another native
listener defect. No trace was run and no causal finding is claimed.

Earlier scratch vehicle failures were missing local Hermes tooling, missing
OneBasic registration, and a disappearing on-demand Peach bridge. Existing Pods
and app identity plus an owned foreground bridge let the actual assertions run.
Full bootstrap logs and bundles remain outside the tree at
/Users/n8/Library/Logs/one-network-hook-proof.

Cleanup: owned server and Peach bridge stopped, browser closed, simulator
shut down and claim released; no owned listeners remain. The already recorded
PosterBoard restoration defect left restoration pending next boot. The disposable
scratch app was removed. Parent p67085 retains this worktree and its node_modules
link. Parent owns defect reconciliation and landing; CI/delivery is p67014.
No Android, coverage/plan edits, package publish, or external report.
