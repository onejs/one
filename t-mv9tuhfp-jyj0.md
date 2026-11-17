---
id: t-mv9tuhfp-jyj0
title: 'One iOS ShortcutsLink late system launch: read system-launch-log.txt on next failure'
status: done
owner_status:
  state: landed
  text: independently reviewed PR1021 merged883e030a; bounded source/behavior complete, broader CI/stable retained existing owners
  updated_at: 1792735589080
labels:
- followup:ci
- oss-fixer
backend: git
sessions:
- p103097
commits:
- 9640bcf6fa198064672e8d021dae1324b892dad0
created_at: 1792086189253
updated_at: 1792742899061
field_marks:
  active_form: 1792086189253
  body: 1792735623276
  claim: 1792742899061
  claim_current:019b0e323a35c074e6a1bf322685142c: 1792742899061
  claim_state:019b0e323a35c074e6a1bf322685142c:1792742899061:~:~:~:o:ae53cf6af2623ce70770b78669e8e74f: 1792742899061
  ? claim_state:ae53cf6af2623ce70770b78669e8e74f:1792733707447:=p103097:=mc-h39p4gbj818h:1792733707447:o:b558baa980e720e0f1253f222e9103e0
  : 1792733707447
  claim_state:b558baa980e720e0f1253f222e9103e0:1792086189253:~:~:~:l: 1792086189253
  commit_linked:9640bcf6fa198064672e8d021dae1324b892dad0: 1792733712185
  evidence_summary: 1792086189253
  owner_status: 1792735589080
  parent: 1792086189253
  priority: 1792086189253
  recovery_ref: 1792086189253
  status: 1792735589080
  title: 1792086189253
---
After PR 918 merges, the next failing One iOS Native Tests run keeps system-launch-log.txt in the one-native-features-ios artifact. Read it around the derived-shortcuts tap (appium.log POST derived-shortcuts click) for the com.apple.shortcuts launch request and why it ran ~133s late (run 38764519020). No One runtime workaround; assertions and bounds unchanged.

RAN new OneiOS38794900597 source03eba6f39f8ff4461c223d4cb8c444e9e8eab422 retained failed log /tmp/ci-router-one-38794900597-failed.log. Build dev/prod, generated bindings, four native Metro/Rolldown jobs pass; only OneNative feature ShortcutsLink red. First no foreground then existing retry AUT not running/AppCrashedError during WebDriver sourceGET. Routed retained new failure to existing p86518; WebDriver claim not independent crash cause. No new dispatch/added retry/timeout change; original systemlog diagnostic followup remains. One watch completed/read, rearming it only, Contrastw-e109aa stays active.

RELAYED RAN p86518 inspected original system-launch-log for38794900597: SpringBoard receives Shortcuts open21:43:41.2, Shortcuts53985 first running-active21:44:11.6 marked first launch after boot. AUT31508 remains activeNotVisible then suspended21:46:19; WDA possibly-crashed message21:46:22 is not process termination evidence. INFERRED cold Shortcuts first-launch precondition rather than One regression, discriminator actual system process lifecycle. Owner PR922 warms Shortcuts via simctl launch/terminate after boot, preserving original foreground timeout/assertions. PR CI is pending behavior probe; no merged/shipped qualification. Router adds no dispatch/retry/new fixer.

Correction superseding prior AUT-never-terminated claim: RELAYED reviewer RAN original artifact line204846 shows AUT31508 suspended21:46:19.35, then RunningBoard terminated0x2182BAD2 Shared Background Assertion invalidation timeout, exit21:46:19.67. Thus actual system termination after app stranded background, not merely suspended at WDA sourceGET; no app-fault stack established. Owner still INFERRED root delayed Shortcuts cold first launch from prior system launch timing; PR922 unchanged, original assertions/bounds preserved. Natural PR/main CI acceptance pending, no new rerun/fixer. Sender correction retained rather than upgrading previous label.

RAN current continuation reconciliation root103097: original authorp86518 live:false, no exact live successor retained in root chain. Current retained failed log /tmp/ci-one39894470856-fixtures-failed.log exists locally and was read without refetch: first ShortcutsLink did not foreground after derived-shortcuts; retry fails missing quick-navigate-path-input120s. These are distinct boundaries; no cold-launch/HMR/Zoom cause attributed. READ local One workflow contains PR922 warm launch/terminate and system-launch-log diagnostic capture, but exact run source/warm outcome and current lifecycle trace not yet bound. Root accepts existing source/evidence continuation only, no new author/producer/rerun/timeout/assertion change. Exact next dependency is current run39894470856 existing one-native-features-ios system-launch-log plus matching Appium tap and workflow/source receipt, from original capture custody.

RAN current canonicalCI103700 custody answer: router retains ONLY failedjob120232853722 log /tmp/ci-one39894470856-fixtures-failed.log, no current system/Appium capture/archive/IDs acquired. ExistingOSS116738 has read current artifact metadata and is metadata custodian, not presumed file retention. Root routes exact locator request there; no log refetch/rerun or acquisition by CI. First foreground failure and retry missing-navigation remain separate.

TESTED original next-failure diagnostic consumed current artifact12478244420 ONCE (SHA256c04d8269429a200b993ea26e025c2fea14494314ebacc9bf88206dfa56a38a7d). Exactsource4728a1a441d9744a281f3fb84fbf6e56a99c1b7f workflow does warm launch/terminate; trace proves warm process68491 terminated04:11:34.113 while scene preparing/notReady, no prior handshake found. Fixture click response04:27:30.007; SpringBoard URL receipt04:27:30.080; final original10s query04:27:40.022 returns1; Shortcuts3222 foreground04:27:42.830, handshake04:27:57.131. Thus actual late system launch established, not missing SDK URL dispatch. Early warm termination is INFERRED incomplete precondition, not proved cause; repeated first-launch diagnostic cannot negate real warm-up. Retry navigation failure separate, no runtime fault attribution. Readout/qualification durable /Users/n8/.team-machine/evidence/one-shortcuts39894470856-p103097/, full capture scripts/tmp/one-shortcuts39894470856/. No source edits/rerun/build/sim/app-bundle acquisition. Next cause prerequisite completed-startup precondition/stack tied to unchanged fixture; no timeout/assertion changes.

2026-10-23 parent103481 authorizes bounded native cause proof using existing cached app/sim only, warm setup edit only after actual baseline/candidate supports, original10s fixture unchanged. RAN local readiness preflight: no booted simulators. One cached NativeFeatureTests exists on pool iPhone17Pro A9BF26C8-2214-4DC6-AA9E-877B19A49FE9, LIVE claimed byp104883; executableSHA256aa6de93bd1857b86b11b46a1af7f33706614a3f5f8fd5ce6bcaa14116e40c75d, version9.9.9/build4242, no bundledJS, source/cache receipt unbound. Did not boot/reclaim/drive. Exact prerequisite is existing cache-source/native app receipt and compatible unchanged4728 JS/test+server surface, plus normal free-simulator admission. Cache custodian asked source/availability only; no rebuild/archive/producer requested.

TESTED native cache prerequisite resolved without rebuild: first and only acquisition of existing app artifact12477831114 (zipSHA2565fe23846f1102c4f23c75a8fea8a36e9ed99bfa63f626c89a805cc4ea18e579e), receipt source4728a1a441d9744a281f3fb84fbf6e56a99c1b7f/run39894470856/cachekeynative-features-ios-app-39894470856/executableSHA256aa6de93bd1857b86b11b46a1af7f33706614a3f5f8fd5ce6bcaa14116e40c75d EXACT matches existing local cached app. App tar not extracted/reinstalled; no producer. Custodian104883 released sim, root claimed then released normally without boot. Local /Users/n8/one HEAD exact4728 and test/helper files unchanged, but node_modules absent, no local/global/npm-cache Appium found; local fixture vitest absent (Contrast vitest alone cannot supply One workspace dependencies). Exact remaining prerequisite is existing prepared One4728 workspace with installed matching dependencies/Appium+XCUITest and cached WDA/app, or parent disposition for preparing those dependencies. No warm setup edit/before-after/native acceptance claimed. Root owns no sim/service, shared cache/evidence preserved.

RAN supported dependencies prepared: frozen install17s/source+lock unchanged; pinned Appium3.6.0/XCUITest12.5.0 installed task-owned home, real driver import passed; scoped supported workspace JS build15targets9s repairs stale dist without tracked changes. Native Shortcuts completed handshake+visible library AX before termination. Original fixture has NOT executed: cached /tmp/wda-build WDA wrapper has missing bundle ID; retained xcresult states Failed to install or launch test runner, missing bundle ID. All74 fixture tests skipped by failed beforeAll. No Shortcuts result/cause claim. Supported Appium setup helper includes WDA build-for-testing; preparing that tooling target in task-owned derived data, keeping exact NativeFeatureTests cache untouched and no full gate/native app rebuild/install.

TESTED CORRECTION to prior cache-identity claim: aa6de93 executable is only40KB launcher; matching it did NOT bind debug native payload. Installed NativeFeatureTests.debug.dylib SHA256ff58f08c7a20d13ccefe9035400d4fc1725c8e9637964eb50570c65a8c198074 linksUIKit212edf3d13b127f5. Exact existing CI archive debug dylib SHA2569f4148c92c4568b537a03c3b0cd8d428a183f633221a1307f2cf5dfc01ce5770 linksUIKit3864e7f38681b875, matching current4728 facade. WDA/session now works but home-screen fails with actual3864 notLinked screenshot because installed old app; Shortcuts test never executes. Exact CI app extracted/verified task-owned exact-ci-app, main/plist match original receipt; no install/rebuild. Root requests parent exception to earlier no-install restriction: install this already-produced exact CI app via normal sim claim, then unchanged fixture. No native build/producer/newarchive/fallback/fingerprint alias. Restored only own auto-generated routes.d.ts change; services stopped/sim shutdown/released.

TESTED exact source helper/native proof: candidate warm-shortcuts.py startup5.588s, original unchanged ShortcutsLink fixture1PASS32.967s/retry0,73unselected. Original10s foreground query succeeds; returning app delivers Shortcuts actions1 and Location actions0. Full installed138files match retained4728 CI artifact including debugpayload, no native app rebuild. Source9640bcf6fa198064672e8d021dae1324b892dad0 pushed tm/shortcuts-ready, PRhttps://github.com/onejs/one/pull/1021. Workflow awaits native accessible controls owned by launched ShortcutsPID beforeterminate; AXe installation moved beforewarm. No runtime fallback/timeout/assertion changes, no added tests. Durable readout/source-result/screenshots /Users/n8/.team-machine/evidence/one-shortcuts39894470856-p103097/. Clean pushed One worktree retained for parent review; owned sim/services closed, primaryOne source clean/shared Contrast preserved. Further improvement noted only: cache receipt should hash full linkedpayload/frameworks, launcherhash alone missed stale212vs3864library. Parent review/stablehold and canonicalCI delivery remain, no whole-native acceptance.

2026-10-23 Nate direct in root103097 turn: "By the way, we can basically land things so long as we get a review". Applies to validated source fix PR1021: after existing independent owner review approves, root may complete normal reviewed merge without another owner permission request. Existing stable publication hold/acceptance remains distinct; no new reviewer or dispatch requested.

RAN source closeout: parent independent review accepted exact9640bcf6fa and PR1021 merged2026-10-23T05:54:17Z as883e030a03226ee0448c77a3e308b34679aaa3e7. Parent ran missing/wrongPID/disabled/zeroGeometry/unlabeled readiness controls and full138file installed payload hash. TESTED merged two paths byte-identical reviewed source. Focused unchanged fixture1PASS/retry0, callback1/location0 and10s foreground preserved. Diagnostic/source task complete, no fullCI/stable clearance. Existing parent103481/CI103700 retain natural containing-source fixture/release acceptance, no newdispatch. Review waiter canceled; clean owned One source worktree being removed, source/evidence durable.

RAN cleanup complete: tm worktree remove reports removed; clean merged source retired to managed recovery /Users/n8/.worktrees/.trash/one-shortcuts-ready-80576-1792735595357/tree for admitted sweep deletion. git worktree list verifies original path absent. Shared Contrast lane tree, source-matched native app/warm dependency cache and durable evidence retained under root103097 custody; no owned live sim/services. Existing stable followup records exact merge/check.
