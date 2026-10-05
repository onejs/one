<!-- proposal: status=proposed owner=r59505 date=2026-10-05 reviewers=p61184,p60786 lane=beta-rolldown-ci-repair branch=tm/beta-rolldown-ci-repair -->

# One v2-beta iOS dev-rolldown runtime repair proposal

PROPOSED (not approved, not implemented). Bounded to the vxrn dev-server
bytecode branch plus its unit tests. No native, template, harness, routing,
HMR, auth, or lifetime change. No timeout, retry, skip, or assertion change.

## RAN: the failure

iOS Native Tests 37269583982 at v2-beta 1fb90038c: generated bindings,
both container builds, dev-metro, prod-metro, and prod-rolldown runtime
PASS. Required dev-rolldown fails HMR 2, protected 3, import-meta 1, then
the job cancels at 60m. No successor run.

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
  loader data: `control-metro-renders.png`.

Evidence (all on pro-64):
`.team-machine/handoffs/one-beta-recovery/rolldown-ci-failure/` holds
`jobs.json`, `workflow.log`, `appium-dev-rolldown.zip`,
`failbefore-rolldown-blank.png`, `control-metro-renders.png`.
Bundle probes: `/tmp/rolldown-index.bundle` (200, 14.7MB),
`/tmp/metro-index.bundle` (200, 19MB); both compile under hermesc exit 0.
Loader endpoint `/_one/assets/*_vxrn_loader.js?platform=native` returns
identical correct JS on both servers. `/hot` accepts and holds sockets.

## TESTED: ownership cause

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
Metro ignores the parameter and serves JS, which the device accepts;
prod bakes bytecode at build time. Same failure shape already visible in
run 37249154367, so this is standing, not a fresh regression.

Callers: exactly one, `reactNativeDevServer.ts:518`. Siblings: the
branch is iOS-only (Android untouched), dev-server-only (prod untouched),
rolldown-only (metro untouched). The template request and the pod-hermesc
choice for real apps stay as they are.

## Proposed fix

Bytecode is a pure optimization; Metro proves plain JS is an accepted
answer. When no usable pod hermesc resolves, warn once and serve the JS
bundle (200) instead of bricking the app with a 500. A hermesc that
resolves but fails to compile a bundle keeps failing loudly (500), so a
broken bundle never degrades silently.

Shape (two files):

- `packages/vxrn/src/utils/compileNativeDevBytecode.ts`: split
  resolution from compilation. A resolver returns the pod hermesc path
  or null when unusable (podspec missing, unparsable, or binary absent);
  the factory returns null in that case and keeps its cache/retry
  behavior otherwise.
- `packages/vxrn/src/plugins/reactNativeDevServer.ts`: in the
  `bytecode=hermes` branch, on a null compiler warn once per server
  (mirroring `warnedProdBundleRequest`) and serve `bundle.code`; cache
  the null so resolution runs once, not per request.

Explicitly not proposed: resolving the test container Pods from
framework code, an env-var override, falling back to the npm hermesc
(known wrong bytecode version under Hermes V1, would crash the app),
serving JS on compile execution failure, or touching the template,
harness, tests, timeouts, or retries.

## Controls (run after approval, before push)

Fail-before is recorded above and immutable: 500 + RedBox on the
bytecode URL, metro 200 + render as the positive control.

Positive (restored serving): on a root without `ios/Pods`, the bytecode
URL returns 200 with bytes identical to the plain bundle URL, and exactly
one warn names the missing podspec; the fresh container on the claimed
iOS 27 sim renders "Welcome to One" against the rolldown server. The two
existing hermes-mode tests still assert real bytecode bytes
(`c61fbc03c103191f` magic), proving the pods-present path is unchanged.

Negative (still loud when it should be): invalid bundle code still
rejects (existing test, unmodified); malformed podspec JSON and a
resolved-but-absent hermesc binary each yield the JS fallback, not a
500; a root WITH pods and a working hermesc never takes the fallback
(assert no warn in that case).

Regression gates: `bun run test` in `packages/vxrn` (full package
suite), the focused bytecode suite, and a device re-run of the exact
fail-before sequence (bytecode curl + sim launch + screenshot). No
harness, template, or CI file changes, so no other suite is in scope.

Preconditions before push: approval from p61184 (first layer) then
p60786 (substantive gate); implementation commit carries a `Validation:`
body; manager p61056 owns v2-beta integration, CI, and canary.
