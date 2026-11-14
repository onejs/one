---
id: t-mvbhhuhu-1m6g0
title: Review One PR932 RN 0.88 fixture scene hooks before normal merge
status: done
owner_status:
  state: needs
  text: s47675 assigned Opus high exactPR9326588a3cf052 source review before normalOne merge; actual fixture/template probes; CI p90480 naturaldelivery
  updated_at: 1792186421063
assignees:
- s47675
labels:
- lane:one-native-peach
priority: 3
parent_id: t-mvbh8ikb-1h0e0
backend: git
created_at: 1792186376610
updated_at: 1792186574955
field_marks:
  active_form: 1792186376610
  assigned:s47675: 1792186421063
  body: 1792186560291
  claim: 1792186376610
  evidence_summary: 1792186376610
  owner_status: 1792186421063
  parent: 1792186376610
  priority: 1792186376610
  recovery_ref: 1792186376610
  status: 1792186574955
  title: 1792186376610
  unassigned:s43018: 1792186421063
---
Assigned differentlarge Opus high source review of Sol s47653 commit6588a3cf052f8b40df5c8bcb59af987695242c5f PR932. Existing approved nativelead/review seat refill. Three fixture-only scripts share generated SceneDelegate handler insertion. Read complete diff/current template and run realhook failure-capable probe: ordinary scene forwarding/continue and app lifecycle unchanged, both handler orders/restarts, unchanged audio interruption and DEBUG background semantics, malformed/duplicate/missingmethod or changedforwarding fails. Temporary probe only, no new orchestrationtests/build/dispatch/producer/sourceedit/reviewchain. One required review before normalmerge; CI p90480 naturalrun/artifact delivery and PR927 hold unchanged. Verdict source-specific, no nativecompile/runtime credit.

PR932 review (Opus high, different large model from author Sol s47653). Source 6588a3cf052f8b40df5c8bcb59af987695242c5f, branch tm/rn088-fixture-scene-hooks, base 9a25ca27b.

VERDICT: PASS. Approve for normal reviewed merge. One optional non-blocking nit below.

Scope read: full diff (3 fixture scripts only, no production/template/API change), current renderSceneDelegateSwift (prebuildWithoutExpo.ts:159), pre-RN088 template (db5cdea6a^), prebuild-native.ts caller order, generateSceneDelegate (unconditional rewrite each prebuild).

Independent probe (own scripts, real hook files from 6588a3cf0, template rendered by evaluating the checked-out renderSceneDelegateSwift source, one bun process per hook run):
- RAN: rendered template byte-identical to author control.swift.
- RAN: origin/main audio and background hooks on current template: both exit 1 "generated SceneDelegate changed", file unchanged. Reproduces the CI hook failure cause (old anchor `guard let url ... else { return }` gone).
- RAN: new hooks, order audio→bg and bg→audio, each rerun a second time in fresh processes: exit 0, second pass byte-identical (idempotent). Only diffs vs template: one `import AVFoundation`, one `if let url = URLContexts.first?.url { ... }` block before the untouched `RCTLinkingManager.scene(scene, openURLContexts:)` line. willConnectTo and continue userActivity methods untouched.
- RAN: whitespace-normalized inserted lines vs old hooks applied to the pre-RN088 template: identical except the added `if let url {` / `}` wrapper. Audio type/.shouldResume/options/interruptionNotification post and DEBUG /refresh /processing /expire switch unchanged. Fixture URLs still return before forwarding (as before); all other URLs and empty contexts reach the template's scene forwarding.
- RAN: xcrun swiftc -parse (syntax only, no SDK/typecheck) on both-order, audio-only, bg-only outputs: ok.
- RAN: rejection, both hooks, exit 1 with file unchanged: openURLContexts method missing, forwarding changed, extra statement after forwarding, forwarding twice, duplicate method, ReactAppDependencyProvider import missing, old guard-style body, already-patched with forwarding changed.

Nit (non-blocking, unreachable in pipeline): `body.endsWith(fixtureEnd)` is satisfied by a deeper-indented brace because "    }\n" is a suffix of "      }\n". RAN: an audio-patched file with the url block's closing `    }` removed is accepted; the bg hook then slices into the audio handler's brace and writes broken Swift (swiftc -parse fails). Also: marker-present early return skips the import check; a foreign body inside the url block is accepted. INFERRED unreachable: prebuild-native always runs `one prebuild` first, which rewrites SceneDelegate from the template, and every such malformed output fails compile loudly, so nothing broken is hidden. Optional one-char tightening `body.endsWith(\`\n${fixtureEnd}\`)` RAN: rejects that case, both orders still byte-identical to the approved outputs. Would be wrong if some path ran the hooks on a stale non-template SceneDelegate.

Simplification/DRY: helper correctly replaces two duplicated anchor implementations with one owner. No further merge owed.

Limits: source-generation proof only. No pods, Xcode build, sim, app launch, or audio/background/link runtime assertion. Native runtime remains required CI's proof (ci-manager p90480). Did not review PR931 or PR927. Read-only: no edits, commits, builds, dispatch, worktrees or services. Probe files in my scratchpad only.
