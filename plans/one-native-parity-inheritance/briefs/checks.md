Audit the one-native conformance suite for checks that cannot fail, or that assert less than they claim, then fix them.

Your worktree. Create it yourself and work only there:
  git worktree add /Users/n8/.worktrees/one-native-checks -b feat/one-native-checks feat/one-native
Do not touch /Users/n8/.worktrees/one-native (mine, live, another agent is writing oracle files in it), and do not touch ~/one.

Read first: plans/handoff-one-native-parity.md in full, especially the section "Known weak spots in the checks", then tests/native-features/scripts/one-native-conformance.ts in full.

The defect taxonomy is not mine. A parallel audit of soot's rnx library conformance covered 42 cases and 146 checkpoints and found 13 that cannot be honestly admitted, in two classes:
1. The graded region contains content that loads asynchronously and nothing waits for it, so the capture races the content. Found in an ExpoImage ImageBackground, a Tamagui WebView document, and six photos in a scroll showcase. Eight of the thirteen were this one defect.
2. The assertion is looser than the pixels it claims to grade: a rounded scroll Y, a 148..152 width range, "nonzero and unchanged".

Find every instance of both classes in the one-native suite. The handoff already names three places to start, and your job is to confirm or refute each rather than assume it:
- "Image variable value stepped proves nothing about the native side." It reads the JS side only.
- "stepper-control has almost no headroom": it measures 188 against a floor of 100, where every other check clears its floor by a wide margin.
- Visual regions are ABSOLUTE fixture coordinates. Adding a seventh category to the controls fixture wrapped its button grid to a third row, moved every control below it down 39pt, and broke five visual checks at once. They reported as "Control appears unpainted", which reads like a product regression and was not one. The handoff proposes anchoring each region to its subject's accessibility frame at capture time. One constraint if you do that: the accessibility snapshot publishes only a `Tab Bar` group node with no per-tab entries, so tab bar geometry cannot come from that path and has to stay pixel-derived.

Method, and this is the whole job. For every check you touch, name the independent variable and say what a null result proves. A check that cannot fail is broken, and so is one that cannot pass. Tighten, never loosen: no widened tolerance, no retry wrapper, no relaxed assertion, no quarantine. Where a check genuinely proves nothing, either make it prove the thing or delete it and say plainly that you deleted it.

Constraints:
- Do NOT boot a simulator and do NOT run the device conformance suite. Simulator 36CB8903-C59C-4438-BA29-E7A3C8876C37 is serving pixel-oracle captures for another agent and the suite is load-sensitive. Your fixes ride along in a device re-run I schedule at integration. So for each fix, tell me exactly what you want run and what observation would falsify it.
- Avoid editing fixtures under tests/native-features/app/. If a fix requires it, say so explicitly, because a fixture layout change shifts every absolute visual region below it.
- Do not push. Commit to your branch and report the SHA to me.
- Nothing outside tests/native-features and packages/one-native.

Evidence discipline: label every causal claim RAN / TESTED / INFERRED / GUESSED, including to me. Absence proves nothing, so do not report "I found no other instances" as if it were coverage; say how you looked.

REVIEW: none - reviewed as part of the assembled one-native foundation

Report one compact message: the audit table (check, defect class, verdict, what it actually proves), what you fixed, what you deleted, the device run you want and its falsifying observation, your branch SHA, and anything you could not settle without the simulator. Then stop.
