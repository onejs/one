# One CLI starter repair

Owner: launch-cli-setup; parent: r54299; review: none, assigned mechanical repair.
Review branch: `fix/launch-cli-setup`, from freshly fetched `origin/v2-beta`.
Original base: `067d7658cce7cccc186e7de32d2bc4a6a402de3b`; synchronized base before
first push: `106ffc430`. Validated code SHA:
`14456901387932e06143274b043c3227480ac984`. Later receipt commits do not change code.

## Result

Basic selects `v2-beta-starter`. The clone cache includes the branch to avoid
reusing cached main. The standalone creator forwards its positional directory
to create. Existing One interactive Basic/Takeout selection and the Vite project
dev path remain intact. No One public flag or type was added; One cli.ts and
cli/main.ts have no final changes.

Workspace substitution pins the creator's exact released version for
workspace:*, workspace:^, and workspace:~. Beta CLI installs its matching beta;
stable CLI installs its matching stable version. No permanent beta tag is
embedded. Exact versions prevent npm selecting unrelated legacy one@2.5.2.

Creator metadata points to actual .cjs/.mjs files. Its build emits advertised
declarations; the root types field enables that output in tamagui-build.
Final source scope is five create-vxrn files and this receipt. Starter
v2-beta-starter remained at `95b754cbd881af6f00ac32e682d0700b0531ca0d`, unchanged.

## Negative controls

RAN: read scripts/blocked-versions.json, which lists legacy one@2.5.2. Actual npm
installs with `one: ^2.0.0-beta.168.1` and `one: ^2.0.2` both installed 2.5.2.
Registry metadata identifies it as a Node package bundler; its installed package
has no one/vite export. Exact beta installation below instead contains the
framework runtime. Logs: negative-resolution.log, range-beta.log, range-stable.log.

RAN: original published creator export probe failed on types/index.d.ts,
types/create.d.ts, dist/cjs/index.js, and dist/cjs/create.js. It skipped types
and emitted .cjs. The repaired installed creator passes all seven targets.

READ: original Basic selected main. Assigned Opus review previously reproduced
main template's missing one/vite and native.app. This lane's successful scaffolds
verify the retained v2 starter; it does not claim a completed original-main
scaffold run of its own.

## Artifact and commands

RAN on Pro64 LAN n8@192.168.0.64: Node 24.16.0, npm 11.12.1,
@tamagui/build@3.0.0-beta.1432.1. Initial sample: 84.37% CPU idle, 24 GiB unused
RAM, 149 GiB free disk. Studio sample was 70.94% idle and 198 GiB free disk.
Validation moved to Pro64 to preserve Studio timing gates. Heavy commands used
`/Users/n8/contrast/scripts/heavy.sh --cores 2 --`, with
`UV_THREADPOOL_SIZE=2 RAYON_NUM_THREADS=2` for runtime work. Admission gates stayed
enabled, including waits behind exclusive measurements.

Remote worktree was /Users/n8/.worktrees/one-launch-cli-setup-validation. Its five
source files match validated code SHA byte for byte; source-sha256.txt records
hashes. Only creator was built. Its dist/types and corrected metadata were
overlaid on packed published creator, retaining version/dependencies
2.0.0-beta.168.1, then repacked. One CLI/runtime came from unmodified published
beta tarball. No framework rebuild was needed.

Commands run, with paths relative to the validation worktree unless stated:

```sh
npm pack one@2.0.0-beta.168.1 create-vxrn@2.0.0-beta.168.1 --ignore-scripts
# in packages/create-vxrn, using installed build dependencies:
/Users/n8/contrast/scripts/heavy.sh --cores 2 -- node /Users/n8/one/node_modules/@tamagui/build/tamagui-build.js
/Users/n8/contrast/scripts/heavy.sh --cores 2 -- /Users/n8/one/node_modules/.bin/tsc --noEmit
# in staged creator with built outputs and beta metadata:
npm pack --ignore-scripts --json
# install published One and locally packed creator into consumer:
npm install --prefix tmp/cli-validation/consumer --ignore-scripts tmp/cli-validation/artifacts/one-2.0.0-beta.168.1.tgz tmp/cli-validation/after-artifacts/create-vxrn-2.0.0-beta.168.1.tgz
# from tmp/cli-validation/after, driven through a 24x120 PTY:
npm exec --prefix /Users/n8/.worktrees/one-launch-cli-setup-validation/tmp/cli-validation/consumer -- one default-basic-online
npm exec --prefix /Users/n8/.worktrees/one-launch-cli-setup-validation/tmp/cli-validation/consumer -- create-vxrn explicit-basic --template Basic
# from default-basic-online:
npm run build:web
npm exec -- one prebuild --no-install
```

One prompt selected default Basic, then npm. Explicit Basic used the existing
creator argument. Both CLI flows performed normal npm install. drive-cli.py and
after-validation.sh preserve PTY commands/assertions. Local creator tar SHA256:
`d19a655cef08dcb1ff34787938ae9ef05da2de4cb6cde0789fabae2fea0ae30a`.

## Runtime receipts

TESTED: creator build (141 ms), typecheck, concrete exports on staged and installed
artifacts (One 82; creator 7), and both real CLI/npm flows passed. Names are
default-basic-online and explicit-basic; each generated exact `one: 2.0.0-beta.168.1`
and installed that framework. Vite configs are byte identical and retain
native.app. Installed beta manifests and vite/native/setup/cli-main files match
published beta tarball byte for byte; beta-content.jsonl records hashes.

RAN: production web build passed with six static pages and client secret scan.
Installed One production serve returned HTTP 200, text/html, gzip, 2,285 bytes.
Probe awaited actual Node listening event before its single request. Output and
mechanism: build-web.log, production-probe.log, production-probe.mjs,
listening-hook.mjs.

RAN: one prebuild --no-install generated iOS and Android. Parsed Info.plist and
pbxproj give display name OneBasic and bundle ID com.natew.oneexample. Android
build.gradle has same applicationId; manifest exports .MainActivity and matching
Kotlin source exists. Podfile and generated React Native configuration exist.
Evidence: prebuild.log, native-manifests.json, check-native.py, native-files/.
Native binary compilation and launch were not exercised.

TESTED: stable substitution used temporary installed creator manifest fixture
version 1.27.1, then restored beta manifest. Existing creator Basic flow generated
exact `one: 1.27.1`, npm installed it, and installed manifest and vite/setup/
native-transforms files matched npm pack one@1.27.1 byte for byte. Registry
description confirms framework. stable-content.json records hashes. one@2.0.2
was unpublished (E404); this proves stable substitution against an available
stable release, not a stable v2 runtime launch.

RAN: existing-app One with no command started dev and returned HTTP 200 and 2,049
bytes HTML. Additional Content-Type assertion failed because published beta dev
server omits that header. This optional probe remains a recorded failure.
One CLI files are unchanged and installed cli/main matches original published
beta. No repo tests/assertions were relaxed, retried, skipped, or changed.

## Harness corrections and delivery

First PTY had zero columns; corrected driver sets dimensions. Offline npm-exec
propagated offline mode to scaffold install and failed ENOTCACHED; normal online
execution passed. Stable probe initially expected description inside tarball
manifest, where npm omits it; later content probe compares full manifests/runtime
bytes to registry tarballs and asserts description against registry metadata.
First production probe requested on printed URL and failed ECONNREFUSED; final
probe waits on actual listening event. Relevant failed logs/assertions remain
saved; no timeout multipliers or request retries were introduced.

Scripts, logs, generated manifests, and tarballs are saved locally under
/Users/n8/.worktrees/one-launch-cli-setup/tmp/cli-validation/pro64-receipts/.
Temporary Pro64 checkout is removed after copying receipts. Studio review
worktree remains clean with all commits pushed. Changed creator formatting and
git diff --check passed. Parent owns delivery and subsequent CI. No main push,
stable publication, docs/post edits, or starter changes occurred.
