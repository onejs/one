# Worklets item: assembled review

RAN: steps 3 and 4 landed and pushed to `v2-beta` as `3b3e99560`.
The automatic Babel worklet fallback is removed. One handles worklet-only
files without requesting a Babel pass. Explicit caller-configured Babel
transforms remain supported. No One main or Contrast changes were pushed.

RAN: three counterbalanced cold/warm bundle pairs per backend and app.
Medians in seconds:

| app | One cold/warm | Babel cold/warm |
| --- | --- | --- |
| one-basic | 3.896 / 2.669 | 4.030 / 3.285 |
| Contrast mobile | 11.509 / 10.813 | 13.958 / 14.707 |

INFERRED from these samples: One's median reductions are 3.3%/18.7% and
17.5%/26.5%. All samples remain in `plans/one-native-speed.md` and
`tests/native-features/evidence/worklets/bundles.json`. One loses the third
mobile warm pair. These are complete production iOS bundle times, excluding
configuration loading, with minification/maps off and no OS cache purge.

RAN: layout transition 72 to 180, gesture callback on the UI runtime, runOnUI
moving 40 points, and gesture timing finishing at 120 passed on iOS 27,
Android API 37 and Chromium. Native Debug binaries ran production JavaScript
from the rebuilt compiler. Receipts and the original-size before/after are
in `tests/native-features/evidence/worklets/`; rerun instructions are in
`tests/native-features/WORKLETS.md`. This reused local native builds containing
concurrent service/navigation edits; it is not the clean-install app matrix.

RAN: compiler 95/95, focused React Compiler/worklet/required-transform/maps
27/27, lint passed. The full native engine suite remains red on filesystem HMR
timeouts and one full-run source-map assertion. Focused maps pass. No test
retries, skips or timeout increases were added. Those failures need investigation.

Public contract remains on pushed branch `feat/native-blessed-packages`,
`83f626a61`; its four entries are Worklets, Reanimated, Gesture Handler and
Screens. Native CLI checks require declared Worklets, Reanimated and Screens;
Gesture Handler is checked when declared. Native run checks cover existing
projects; web-only apps perform no native package checks. RAN: 27 CLI/contract
checks and generated-consumer drift checks passed. The export and native peer
policy await Nate's review before landing.

The corrected proposal is `plans/one-native-worklets-proposal.md` on that
branch. It explains the tooling list and traces seven native libraries to
consumers: the four app packages plus One-owned op-sqlite, Nitro Modules and
Nitro Image. The earlier external Glass, Tamagui Sheet and Web Image inventory
was withdrawn. The metadata currently contains the four app peers; the three
One dependencies retain their existing installation ownership.

Step 5 is design only: One-owned `SharedValue<T>` with `.value`, `.get()` and
`.set(value)`, `useSharedValue`, `useMotionValue`, `useKeyboardHeightValue`,
and `PagerProps.pageOffset`. Storage and scheduling use One's sync registry
and Worklets. UI subscriptions and optional Reanimated mapper integration need
proof before implementation. No per-frame API exports were implemented.

Review: m19584 reviews this assembled item. Open: Nate's public contract
approval and broader engine failures. Both devices and owned servers were
released. Worktrees remain clean and pushed under `~/.worktrees/`:
`one-one-native-blessed-packages` and `one-one-native-worklets-validation`.
Canary publication from the v2-beta push is owned by the manager; no artifact
verification or stable release is claimed here.
