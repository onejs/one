# Background computation proof

Source: One `feat/background-computation`, Contrast `feat/one-background-computation`.
One source commit f8e56cdc623ba44fbea2d7ea0cc4ea198de3a71d, based on v2-beta
5808e174d55d2914e58a4996744f44277ca7d676. Contrast source fe0484e86f49b9bf533ca4554a4b74a68de3232a.

TESTED: the actual `examples/app-home-designer/features/rally/useRallyCourse.ts`
hook runs its real calculation, with 37 starter scene objects, through One's
module-scope definition. Each platform produced exactly the synchronous baseline
for start, checkpoints, course, blocks, ramps, pads and pins. Expected output:
`passed revision=1 checkpoints=3 legs=3 objects=37`. The retained native captures
and Chromium development/production outcomes show that output. This mounts the
real feature in a native/web harness; the full playable WebGPU app was not tested.
The synchronous calculation exists only in the harness as its comparison oracle.

TESTED: separate contract probes run delayed revision 1, superseded failing
revision 2, accepted revision 3, a current error and disposal. Native reports
`latest=3 value=6 runtime=worklet error=handled dispose=silent`; web reports the
same with `runtime=worker`. Both hook probes report `hook=14 current=true`.
Runtime identity is computed inside the imported calculation, using Worklets'
runtime kind and the worker's absence of a document. A main-thread calculation
would report `main` and fail the probe. Chromium also asserts a Worker was created
and no page errors occurred. Unit tests with controlled deferred responses cover
stale completion/error suppression and immediate withdrawal of an accepted result.

RAN: iPhone 17 Pro on iOS 27 (claimed C75DA2BC-721A-491D-A8C4-65943DA33F67),
Android 37 emulator (leased emulator-5586), Chromium 145.0.7632.6. Native uses
installed Debug hosts with RN 0.87.1 and Worklets 0.12.2, serving production-mode
JavaScript built by One's native bundler. The harness registers the Debug host's
HMRClient module explicitly. No native source change was needed for this API.

RAN: One and vxrn builds, vxrn no-emit typecheck, 126 owner/docs checks and 34
selected bundler/worklet checks passed. Native pure-graph tests reject runtime
dependencies/globals. Four added definition checks execute a helper graph and
reject inline and component-scoped definitions. Native snapshots contain the
expected result and no redbox. SSR proof ran under Node with no global Worker,
rendered null/current-null and needed no worker. Lint has zero errors and the
existing `no-this-alias` warning in workletImportsPlugin.

RAN: `bun release --into` installed the package family in the isolated Contrast
worktree. Final installed One native background module and vxrn bundle were
byte-compared with the built upstream files. The vxrn bundle includes the
ANDROID_SERIAL-to--device fix. The harness aliases the upstream built One module
and React to ensure one module instance across both worktrees; this validates the
built API and real app source, rather than a clean registry-install claim.

Repeat from the One worktree, with dependencies and changed packages built:

```sh
# heavy is supplied by Contrast's workspace scripts; use its leased admission.
cd /Users/n8/contrast
PORT=8098 bun heavy --service --cores 1 -- bun /Users/n8/.worktrees/one-background-computation/tests/native-features/scripts/background-computation-server.ts
# for the real Rally feature, use a separate server:
CONTRAST_SOURCE=/Users/n8/.worktrees/contrast-one-background-computation PORT=8108 bun heavy --service --cores 1 -- bun /Users/n8/.worktrees/one-background-computation/tests/native-features/scripts/background-computation-server.ts
```

In the One worktree:

```sh
bun tests/native-features/scripts/background-computation-web-proof.ts
bun tests/native-features/scripts/background-computation-web-proof.ts --production
CONTRAST_SOURCE=/Users/n8/.worktrees/contrast-one-background-computation PROOF_URL=http://localhost:8108 bun tests/native-features/scripts/background-computation-web-proof.ts
CONTRAST_SOURCE=/Users/n8/.worktrees/contrast-one-background-computation bun tests/native-features/scripts/background-computation-web-proof.ts --production
node --experimental-strip-types tests/native-features/scripts/background-computation-ssr-proof.ts
```

Launch the installed `NativeFeatureTests` iOS host on a newly claimed iOS 27 device
with `-RCT_jsLocation localhost:8098` (or 8108 for Rally). On Android set the host's
`debug_http_host` preference to `10.0.2.2:8098` (or 8108), force-stop it and launch
its `.MainActivity`. Use `ANDROID_SERIAL` with One CLI; this proof used explicit
`adb -s emulator-5586` for every operation. After the app has settled, capture and
assert using the retained script (add `--rally` for the Rally server):

```sh
PLATFORM=ios DEVICE=<claimed-udid> bun tests/native-features/scripts/background-computation-native-proof.ts
PLATFORM=android DEVICE=<leased-serial> ADB=<sdk-adb> bun tests/native-features/scripts/background-computation-native-proof.ts
```

The worker production asset was 36.68 kB for Rally and 0.55 kB for the contract
probe. These are bundle sizes, not a speed comparison. Heartbeat values in Rally
captures are diagnostic counts while waiting, not a timing or throughput claim.

OS background tasks were outside the corrected computation scope. Existing iOS
OS-task behavior was read, not runtime-tested. Android OS scheduling is a rank 6
proposal. Metro and captured component/native state are explicitly excluded by
the computation API doc. Next primitives are proposals only in rank 5 of the plan.

TESTED retention correction: the real One hook was mounted in Chromium with a
controlled executor producing one synthetic 16 MiB result. Before the fix, both
React fibers retained the same output through five inactive commits despite null
public result/current and disposal. The corrected hook keeps only phase/revision
in React state; both output-bearing state references are absent while exact
owner/result identity remains. The negative release assertion failed before the
fix. The strengthened probe also passed latest revision, definition replacement,
pending disposal/reactivation and stable-reader checks (six executions, three
owners/disposals). This proves references, not heap collection or phone memory.
Receipts are in `retention/`; rerun `bun tests/native-features/scripts/background-computation-retention-proof.mjs released`.
