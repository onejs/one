soot `main` has a broken engine build. Fix it. It is blocking other agents' workers right now, so this is the whole job and it should be small.

## The break, every fact verified by me at origin/main just now

Commit `4118b8a857` ("fix(mobile): Record screen choreography native runtime"), which reached main through the merge `40bf95abfc`, does two contradictory things:

1. RAN, `git show origin/main:packages/compat/src/generated/native-package-names.ts` line 785 contains `'react-native-screen-choreography',`. Being in that list makes rnx auto-stub the package.
2. RAN, `git show origin/main:packages/sootsim-engine/src/test-fixtures/ScreenChoreographyTest.tsx` lines 10 and 11 import `{ ChoreographyProvider }` from `react-native-screen-choreography` and `{ useLatchedReveal }` from `react-native-screen-choreography/core`.
3. RAN, `packages/compat/src/stubs/native-auto-stub.ts` exports a default stub plus a generic noop event-listener surface (`addEventListener`, `removeListener`, `getAsync`, and similar). It exports neither `ChoreographyProvider` nor `useLatchedReveal`.
4. RAN, `git show origin/main:package.json` line 194 declares `"react-native-screen-choreography": "0.5.0"`, so the real package is present and the fixture would resolve if the stub list did not intercept it.

So the generated stub list shadows a real dependency whose named exports a fixture needs. The last commit anyone reports typechecking clean is `a696ef6932`, immediately before the merge.

## What I am NOT telling you to do

I found two plausible shapes and deliberately did not pick one, because this is your subsystem call and I do not own it:
- `packages/compat/src/stub-registry.ts` already maps specific packages to real or passthrough loaders rather than the generic auto-stub (see `load_reanimatedPassthrough` and `'react-native-reanimated': load_reanimatedPassthrough` around lines 270-289). A loader for this package would be the same pattern.
- Or the package should simply not be in the auto-stub list, so the declared 0.5.0 resolves.

Work out which one matches the intent of "Record screen choreography native runtime", a fixture that exists to prove the native runtime works. Note that `native-package-names.ts` lives under `src/generated/` and is produced by `packages/compat/scripts/generate-native-package-names.ts`, so if the fix belongs there it belongs in the generator or its input, never as a hand edit to generated output.

## Ownership

The session that authored this, `react-native-screen-choreography-0` on pro-128, has EXITED. Do not try to wake it, and do not wait for it. You own the fix.

## Validation before you report

- The engine build must actually build. Do not report a fix you have only reasoned about.
- `bun check` must pass. If something is red, check whether it is red without your change before attributing it to yourself; main has had unrelated reds today.
- If a fixture or test exercises this path, run it.

## Constraints

- Do NOT touch `packages/conformance`, `packages/library-conformance`, or the pixel baseline manifest. r27161 is mid-admission there and will collide with you.
- Read `skills/commit.md` section `## worktrees` before creating a worktree: a worktree whose `node_modules` symlinks to the primary checkout silently resolves workspace sources from `/Users/n8/soot` rather than from your tree. Give yours a real `bun install`.
- Do not push. Commit and report the SHA to me; I push and I will do it promptly because people are blocked.

Label every causal claim RAN / TESTED / INFERRED / GUESSED. Report: what the contradiction actually was, which shape you chose and why the other was wrong, your validation output, and your SHA. Then stop.

REVIEW: none
