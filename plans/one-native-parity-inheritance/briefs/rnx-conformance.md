You are leading a conformance campaign in `~/soot`. Nate asked for this directly and called it important work. Push validated work to soot main on your own initiative, as the repo contract allows.

## Goal

A pixel-diff conformance suite for the SwiftUI-backed surface of rnx, with full light AND dark coverage. Today's coverage is partial and uneven. The end state is a suite that actually fails when rendering regresses, across the whole surface, not a handful of screens.

## First, calibrate scope (do this before building anything)

Read `~/.claude/skills/rnx-visual/SKILL.md`, `rnx-test`, `rnx-setup`, `rnx-debug`. They describe the existing `rnx screenshot` capture and `rnx debug snapshot`/`diff` primitives. Then inventory what conformance exists today and what it covers.

Produce, before writing suite code, a ranked worklist in `plans/` split into three tiers:
1. **Popular and completely uncovered.** Things real apps use constantly that have zero pixel coverage. This tier goes first.
2. **Covered but weakly.** A screenshot exists, but it asserts almost nothing, or only light mode, or one device size.
3. **Covered but incompletely.** Real coverage with named gaps.

Report that worklist to me before you start wave one, as one compact message. I want to see the ranking, not approve every item.

If my framing of "the SwiftUI-backed surface of rnx" does not match how the repo is actually organized, say so in that message and propose the right carving. Do not silently build against my guess.

## How to run it

- Use helpers. 3-4 agents at a time, no more. `tm run --group md` (agy leads it) or `--agent grok-builder --option effort=medium` for bounded implementation and fixture work. Keep Grok's tool calls tightly bounded: three to five targeted operations then deliver, never open-ended crawls.
- **Fresh agents for new work.** Do not keep handing unrelated tasks to a worker that already finished something; spawn a new one with a clean brief.
- **Clean up as you go.** Stop every worker when it has delivered. Do not leave dev servers, simulators, or playwright hosts running after a wave. This machine has been running out of memory from abandoned dev process groups, so check `orphans` (alias for `dev-orphans`) at the end of each wave and reap what your campaign created. Never `orphans-kill` blind: it has no age gate and will kill other sessions' live work.
- Tell every worker what it does NOT own.
- REVIEW: you own the disposition for slices you assign. Do not review each slice; assemble one review per wave from a different model. Do not re-review work that already passed a wave review.

## Specific asks

- **Dark mode is not a variant, it is half the suite.** Every case gets both. If the harness cannot currently drive appearance switching deterministically, fixing that is part of wave one, not a later nice-to-have.
- **A glass campaign is in scope and wanted.** iOS 26 glass materials are exactly the kind of rendering that regresses invisibly. Cover it.
- **Publishing: solve it locally for now.** You need a way to store and compare baselines without an official pipeline. Pick the simplest local mechanism that works and write down why, in the plan. Official publishing and hosted conformance are explicitly deferred, so do not build for them and do not npm publish anything.
- A test that cannot fail is not a test. Before adding a case, name what regression it would catch. A screenshot of a screen that never asserted the app mounted is not evidence.
- Never loosen an assertion or add a retry to get green. A flaky pixel case is reporting a real nondeterminism; close the window instead.

## Bounds

You do NOT own: `~/one`, the `feat/one-native` branch, the `one-native` package, the iOS simulator `36CB8903-C59C-4438-BA29-E7A3C8876C37`, the dev server on port 8107, any npm publish or release tag, or any other session's work. Those are mine or someone else's.

Label every causal claim RAN / TESTED / INFERRED / GUESSED.

Report to me (session r26032) at these points only: the ranked worklist before wave one, the end of each wave with what landed and what it now catches, and any blocker needing a decision. Not progress updates.
