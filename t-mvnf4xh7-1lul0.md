---
id: t-mvnf4xh7-1lul0
title: Attribute and reduce One iOS startup after AppDelegate init
status: canceled
owner_status:
  state: landed
  text: owner stopped startup work; documentation pushed; no runtime optimization shipped
  updated_at: 1792911255045
assignees:
- r128005
labels:
- lane:one-startup
- umbrella:one
parent_id: t-mvluzwx4-za50
backend: git
sessions:
- r128005
created_at: 1792908008827
updated_at: 1792911294137
field_marks:
  active_form: 1792908008827
  body: 1792911294137
  claim: 1792911262056
  claim_current:d0b758c812d67742a456f74bf5ee79c6: 1792911262056
  claim_state:33f04bbcbde035beddc83f8b1db94573:1792908046410:=r128005:=mc-12ehvc19fsga:1792908046410:f: 1792908046410
  claim_state:d0b758c812d67742a456f74bf5ee79c6:1792911262056:~:~:~:o:33f04bbcbde035beddc83f8b1db94573: 1792911262056
  evidence_summary: 1792908008827
  owner_status: 1792911255045
  parent: 1792908008827
  priority: 1792908008827
  recovery_ref: 1792908008827
  status: 1792911262056
  title: 1792908008827
---
Worker for s72425. Attribute post-PR1037 startup phases; fix avoidable One/vxrn work only. Interleaved simulator cold launches, warmup and at least nine each. Branch tm/one-ios-postmain, no One main push. Native dependencies remain unchanged.

RAN: loaded pre-1037 evidence from air-32 and current RCTInstance, RCTTurboModuleManager, scene and router source. Post-1037 marked app and build no longer exist (lead confirmed). Building one baseline on pro-64 with cached prebuilt RN and CocoaPods; diagnostic hooks live in the app, no React Native dependency edits. The 8.5 ms after SceneDelegate startReactNative is after all One scene code returns; source attributes that interval to UIKit pending runtime boundaries.

RAN: pro-64 baseline native build admitted; using Release prebuilt React-Core, Hermes and ReactNativeDependencies from shared caches. Simulator FADD98B8-5708-495F-9C18-511787A655EF claimed by r128005 and booted. Build job is governor-paused under sustained host CPU pressure; no dependency sources changed. Diagnostic and build source under scripts/tmp/ios-postmain.

INFERRED from source: RCTInstance owns JS-thread startup, Hermes/ReactInstance creation and legacy module-class scan before ImageLoader. RCTHost.didCreateContextContainer is a forwarding hook. RCTReactNativeFactory owns makeKeyAndVisible; One SceneDelegate returns immediately after startReactNative. One router owns async Linking.getInitialURL gating plus per-layout/page lazy-import suspension. Runtime probes cover these boundaries; no performance gain claimed before completed measurements.

RAN: plain RN rival Release build succeeded after correcting objc init-family annotations in the app-only probe; installed, launched and stopped. Probe emits JS-thread, Hermes/ReactInstance, TurboModuleManager, native modules, component registration, script execution, JS render/layout-effect/rAF and mount timings. One baseline still compiles; exact completion wait armed. Rival first probe launch is an under-load harness validation, not an accepted timing comparison.

RAN: load-monitor asked to release the booted simulator during the build wait. Shut down FADD98B8-5708-495F-9C18-511787A655EF and released claim; preserved rival install and probe capture. Reclaim standard pool simulator after baseline build event. Existing exact wait w-806766 remains active.

RAN: One baseline completed framework/SDK compilation in 2048s but final link failed on _startupMark. Prebuild had overwritten the temporary Xcode source entry added before pod install finished; app source marks remained. Added StartupProbe.mm after project generation completed and started incremental build-one-2.log. No dependency or product source repair needed. Rival probe has already compiled the same Objective-C++ diagnostic hooks successfully.

RAN: owner direction relayed by s72425: "we don’t need to optimize the startup anymore". Stopped without new builds or timing. Documentation commit 3ac8f97e6f7cf6ba2427e828c16463f270ca4900 pushed to origin/tm/one-ios-postmain; git diff --check passed. Existing Release simulator builds succeeded and one separate under-load launch per app reached content (One 119.55 ms, plain RN 111.08 ms); no warm-up or interleaved comparison, no performance gain established. Source ownership and incomplete attribution recorded in plans/one-ios-startup.md. Removed unmeasured screens-import candidate and app marks from tracked source; preserved patch, probe sources, traces, logs and diagnostic bundles/maps at /Volumes/CI/held-evidence/one-ios-postmain-r128005, live owner s72425. Apps stopped, owned simulator FADD98B8-5708-495F-9C18-511787A655EF shut down/released/deleted, staleness watcher stopped, no owned build windows or active waits remain. CI owner ci-manager; docs-only change needs no dedicated CI watch, deployment or production check. Worktree removal follows; no further startup work requested.

RAN: clean pushed worktree removal attempted from primary checkout; tm kept it only for this session’s own PIDs 61148/61263/62709 and reports release on session exit. No external holder or retained consumer. Detailed handoff and evidence outside tree at /Volumes/CI/held-evidence/one-ios-postmain-r128005. Daemon cleanup on exit is the only remaining resource action.
