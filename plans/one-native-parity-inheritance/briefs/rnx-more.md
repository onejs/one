Implement the iOS tab bar More overflow in rnx, then tab bar minimize behaviour when its measurements land. You are the implementer; r27161 owns the pixel conformance cases and will write them against what you build.

Repo /Users/n8/soot. Work in your own worktree, and read skills/commit.md section "## worktrees" FIRST: a worktree whose node_modules symlinks to the primary checkout silently resolves workspace sources from /Users/n8/soot rather than from your tree, so cross-package work gets graded against the wrong sources. Give your worktree a real `bun install`.

The file is packages/sootsim-engine/src/ios/FloatingTabBar.tsx. RAN, verified by me just now: `tabBarMinimizeBehavior` and `minimizeBehavior` have zero hits anywhere in packages/sootsim-engine/src, and FloatingTabBar has no tab overflow of any kind, no slot truncation and no overflow destination. Its only "overflow" mentions are a CSS comment about the selection indicator painting above the bar glass. So both features are genuinely absent, not partially built.

## What More must do, all MEASURED on a real iPhone 16 by r28205, not guessed

Overflow rule: past five tabs, iOS shows the first four plus a More tab. Six tabs puts Fifth and Sixth in More, seven puts Fifth, Sixth and Seventh, and five-plus-search puts Fifth and Search there.

The bar is display-only and this is the most important constraint, because it makes your job smaller. TESTED across four cells with two independent methods: opening More, and then selecting a row inside it, both leave the bar's five slots byte-identical. Tab centres [61.7, 128.9, 196.2, 263.3, 331.5] and capsule {x:20.8, y:769, w:351, h:62} are identical at rest, with More open, and after a row is chosen. Accessibility agrees, Tab Bar frame 0,769,393,83 in all three states. So the selected tab is NEVER promoted into a visible slot. Implement no promotion rule. The selection shows inside More.

More is a pushed navigation destination, not a sheet. Full-screen list, its own inline "More" title, a per-row disclosure chevron, and selecting a row pushes a second level carrying a "More" back button. The bar stays visible underneath the whole time.

Row geometry, pixels cross-checked against accessibility, which publishes a node per row so this has a real second method:
  first row top 177pt (agrees in both methods)
  row pitch 55/56pt by pixels and 56pt by accessibility; the 1pt spread is the hairline separator sitting on the row's bottom edge
  separator inset 49.7pt left, 20pt right
  glyph ink 17x17pt, centre x 24.8pt
  label left edge 51pt
  chevron 7x12pt at x 365.3pt

A role="search" tab inside More is an ordinary row labelled "Search". Same pitch, no search field, no magnifier, no special position. The detached-capsule treatment does not survive into the overflow list.

One number is known bad and you must not use it: the capsule measured 35.7pt tall while More was open, against 62pt at rest. That is a measurement artifact from the method failing over a white list, contradicted by both the rim trace and accessibility. Use 62pt. Those oracle rows carry barMeasurementTrusted:false.

All of the above is LIGHT appearance only. Dark is unmeasured and is not your problem yet; do not invent dark values.

## Minimize behaviour

Not yet. r28205 is capturing a frame sequence through a scroll, tagged with the scroll offset per frame, because the resting states of automatic/onScrollDown/onScrollUp are byte-identical and only differ in motion. I will send it when it lands. Do not implement a curve from a still or from the iOS documentation.

## Constraints

- Do not touch conformance cases or pixel baselines. r27161 owns packages/conformance, packages/library-conformance, and the baseline manifest, and is mid-admission. If you believe a case needs changing, tell me, do not change it.
- Do not break the tab slot sizing that just landed in 9b9160322b, which sizes a slot from its label at the label's SELECTED weight. There is an integration test at packages/sootsim-engine/test/kitchen-sink/integration/floating-tabbar-label-wrap.test.ts. The old model assumed equal width per tab with text not influencing sizing, and that was wrong; do not reintroduce it.
- rnx is iPhone-only. There is no iPad in the device catalog and no size-class model in the engine, so do not build a regular-width or sidebar path.
- Do not push. Commit validated work and report the SHA to me; I push.
- Run `bun check` before reporting and say what it gave you. If something is red, check whether it is red without your change before attributing it to yourself.

Evidence discipline: label every causal claim RAN / TESTED / INFERRED / GUESSED. A fix carries premises and premises are claims too, so name the premises yours depends on. If a check cannot fail it is not a check.

REVIEW: r27161 when you finish. It owns the rnx tab bar model and writes the conformance cases against your work, so it is the right reader. Send it one compact handoff, not a narrative.

Report to me: what you implemented, the measured values you keyed it on, your `bun check` result, your branch and SHA, and anything in the geometry above that turned out to be insufficient to build from. Then stop.
