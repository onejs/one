<!-- proposal: status=proposed-rev2 owner=r59505 date=2026-10-05 reviewers=p61184,p60786 lane=beta-rolldown-ci-repair branch=tm/beta-rolldown-ci-repair supersedes=ee849e31b -->

# One v2-beta iOS dev-rolldown runtime repair proposal (rev2)

PROPOSED (not approved, not implemented). Supersedes ee849e31b per
manager correction: no resolve-or-null/warn/serve-JS fallback (conflicts
with one path, no fallbacks). This revision supplies actual native
compiler ownership in the split test layout through the existing
HERMESC_PATH mechanism, preserves matching-Hermes bytecode on every
served response, and loudly rejects broken config or compile. No native,
template, harness, routing, HMR, auth, or lifetime change. No new public
API, no new env var, no new workflow outputs. No timeout, retry, skip,
or assertion change.

## RAN: the failure (unchanged, immutable)

iOS Native Tests 37269583982 at v2-beta 1fb90038c: generated bindings,
both container builds, dev-metro, prod-metro, and prod-rolldown runtime
PASS. Required dev-rolldown fails HMR 2, protected 3, import-meta 1,
then the job cancels at 60m. No successor run.

Appium artifact (79MB appium.log): the ONLY element ever queried is
`quick-navigate-path-input`, 38,820 lookups, zero successes. Page-source
snapshots are byte-identical from first paint (9438/9439 bytes). Every
test dies at the same gate with the app alive: the RedBox below carries
no testID, so the harness polls until timeout.

Fail-before reproduced locally on origin/v2-beta d3770b778
(runtime-identical to 1fb90038c, docs-only delta), fresh Debug container
built from worktree source (Xcode 27.1, SDK 27.1), iPhone 17 Pro iOS 27:

- `GET /index.bundle?platform=ios&dev=true&minify=false&bytecode=hermes`
  on the rolldown dev server returns **500 in 1.5ms**:
  `ENOENT .../tests/test/ios/Pods/Local Podspecs/hermes-engine.podspec.json`
  at `nativeDevBytecodeCompiler (compileNativeDevBytecode.mjs:11:29)`
  via `handleRNBundle (reactNativeDevServer.mjs:369:27)`.
- The device renders that 500 body as a RedBox and nothing else:
  `failbefore-rolldown-blank.png`.
- Positive control, same container, same sim, metro server on :8081:
  the identical `bytecode=hermes` URL returns **200 with plain JS** in
  0.75s, and the app renders "Welcome to One", native-setup true, and
  loader data: `control-metro-renders.png`. (Metro parity is evidence
  only; the fix does NOT copy it.)

Evidence (all on pro-64):
`.team-machine/handoffs/one-beta-recovery/rolldown-ci-failure/` holds
`jobs.json`, `workflow.log`, `appium-dev-rolldown.zip`,
`failbefore-rolldown-blank.png`, `control-metro-renders.png`.
Bundle probes: `/tmp/rolldown-index.bundle` (200, 14.7MB),
`/tmp/metro-index.bundle` (200, 19MB); both compile under hermesc exit 0.
Loader endpoint `/_one/assets/*_vxrn_loader.js?platform=native` returns
identical correct JS on both servers. `/hot` accepts and holds sockets.

## TESTED: ownership cause (unchanged)

Commit 11e018cd7 (2026-10-03, "Precompile iOS dev bundles for cold
routes") made the prebuild template append `bytecode=hermes` to the iOS
dev bundle URL and taught the rolldown dev server to compile JS to
bytecode with the pod hermesc. Two facts collide:

1. `nativeDevBytecodeCompiler(root)` synchronously reads
   `<root>/ios/Pods/Local Podspecs/hermes-engine.podspec.json` with no
   error handling (`packages/vxrn/src/utils/compileNativeDevBytecode.ts:17`).
2. In the test layout the dev server root is `tests/test`, which has no
   `ios/` directory; the native project lives in `tests/rn-test-container`.

Every dev-rolldown iOS bundle request therefore throws ENOENT and
`handleRNBundle` answers 500. Real apps (server root holds `ios/Pods`
after prebuild) are unaffected, which is why only this CI job is red.
Same failure shape already visible in run 37249154367, so this is
standing, not a fresh regression.

Callers: exactly one, `reactNativeDevServer.ts:518`. Siblings: the
branch is iOS-only (Android untouched), dev-server-only (prod untouched),
rolldown-only (metro untouched). The template request and the pod-hermesc
choice for real apps stay as they are.

## RAN: the existing supported mechanism

No `native.root` option exists in the One plugin config, and no new
public API is proposed. The compiler already crosses the split layout
through `HERMESC_PATH`:

- `build-ios-test-container-app.yml` is configuration-generic: Find and
  Cache hermesc run for Debug and Release alike and publish
  `hermesc-cache-key` / `hermesc-path` for both. Both configs build with
  `RCT_HERMES_V1_ENABLED=1`, so the Debug hermesc matches the Debug VM.
- `test-native-ios.yml` "Download Hermes V1 hermesc" runs only for prod
  today; the Run Tests step sets `HERMESC_PATH` from the prod outputs
  when the cache matched.
- `packages/test/src/setupTest.ts:366` spawns `one dev` with `process.env`
  minus only `MODE`/`VITE_TEST_ENV_MODE`, so `HERMESC_PATH` already
  reaches the dev server process with zero harness changes.
- Env overrides are the established vxrn pattern (`VXRN_*`,
  `ONE_METRO_MODE`); `HERMESC_PATH` itself is consumed by the harness
  (`packages/test/src/internal-utils/ios.ts:331`) for the same binary.

Fixture/config wiring therefore needs no framework invention: the dev
job downloads the hermesc the dev build already publishes, and vxrn
honors the same variable the harness honors.

## Proposed fix

One response contract, kept: a `bytecode=hermes` request is answered
with matching-Hermes bytecode or a loud 500. No JS fallback anywhere.

1. `packages/vxrn/src/utils/compileNativeDevBytecode.ts`: honor
   `process.env.HERMESC_PATH` as explicit compiler ownership. When set,
   validate it (exists, regular file, executable) and use it directly
   with no podspec read; when unset, keep the existing pod-path
   resolution byte-for-byte. Every resolution failure throws an
   actionable error naming the variable, the path tried, and the owning
   layout (test job must download the hermesc cache; real apps need
   `ios/Pods` from prebuild), still surfacing as the existing 500.
   Compile execution failure is untouched and still loud.
2. `.github/workflows/test-native-ios.yml`: extend "Download Hermes V1
   hermesc" and the `HERMESC_PATH` env to `dev` + `rolldown`, sourced
   from the DEV build outputs (matching Debug VM). Prod, metro, and all
   other jobs are untouched; no build-workflow change (it already
   publishes both configs).

Explicitly not proposed: serving JS on any bytecode failure, resolving
sibling container Pods from framework code, a new `native.root` option,
a new env var, npm-hermesc fallback (wrong bytecode version under V1),
or touching the template, harness, tests, timeouts, or retries.

## Controls (run after approval, before push)

Fail-before is recorded above and immutable: 500 + RedBox on the
bytecode URL, metro 200 + render as the positive control. No full
baseline rerun and no added matrix: one focused bytecode URL probe plus
one focused sim launch, both already demonstrated.

Positive (restored serving): with `HERMESC_PATH` set to the
dev-container hermesc on a rolldown dev server rooted at `tests/test`
(no `ios/Pods`), the bytecode URL returns 200 whose first bytes are the
Hermes magic `c61fbc03c103191f`; the fresh container on the claimed iOS
27 sim renders "Welcome to One". The two existing hermes-mode unit tests
still assert real bytecode bytes with the var unset, proving the
pods-present path is unchanged.

Negative (loud where it must be): `HERMESC_PATH` set to a missing path
yields 500 naming the variable and path (new unit test); unset with no
pods yields 500 naming the podspec path and the override (new unit
test); malformed podspec JSON with the var unset still throws (new unit
test); invalid bundle code through the override binary still fails
compilation loudly (existing rejection test, unmodified).

Regression gates: `bun run test` in `packages/vxrn` (full package
suite), the focused bytecode suite, the exact fail-before curl + sim
launch + screenshot sequence, and a workflow-syntax check of the edited
test job (`actionlint` if present, else `gh workflow view`). No other
suite is in scope: no harness, template, or app-code change.

Preconditions before push: approval from p61184 (first layer) then
p60786 (substantive gate); implementation commit carries a `Validation:`
body; manager p61056 owns v2-beta integration, CI, and canary.
