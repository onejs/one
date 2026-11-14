---
id: t-mvd7hxug-15110
title: sdk call arguments as nitro values, benchmarked; then react state hooks
status: done
owner_status:
  state: landed
  text: reviewed fixes pushed and validated on simulator; direct C++ parity limit documented; s50803 review next
  updated_at: 1792314862858
assignees:
- ios-sdk-wire
- s51663
parent_id: t-mvd7hx3j-14wo0
backend: git
sessions:
- s51663
commits:
- 0ad4e9da6
- 247ad272e
- 380f90265
- 42cb3ea3f
- 48ea7e36e
- 5ae7f1c58
- 6f73be1d2
- 80b893172
- 8d36a972c
- 94495694b
- db8ec5208
- dc39fb8b5
- fc9a360e8
created_at: 1792290517144
updated_at: 1792314862858
field_marks:
  active_form: 1792290517144
  assigned:ios-sdk-wire: 1792290586597
  assigned:s51663: 1792311665034
  body: 1792314862858
  claim: 1792290517144
  commit_linked:0ad4e9da6: 1792310623921
  commit_linked:247ad272e: 1792314847017
  commit_linked:380f90265: 1792310623886
  commit_linked:42cb3ea3f: 1792314847090
  commit_linked:48ea7e36e: 1792314846979
  commit_linked:5ae7f1c58: 1792310623986
  commit_linked:6f73be1d2: 1792314847055
  commit_linked:80b893172: 1792310624024
  commit_linked:8d36a972c: 1792310623953
  commit_linked:94495694b: 1792310623851
  commit_linked:db8ec5208: 1792310623811
  commit_linked:dc39fb8b5: 1792310623747
  commit_linked:fc9a360e8: 1792314846917
  evidence_summary: 1792290517144
  owner_status: 1792314862858
  parent: 1792290517144
  priority: 1792290517144
  recovery_ref: 1792290517144
  status: 1792314862858
  title: 1792290517144
---
Owner direction, 2026-10-17, scope SDK transport/state: "We can make a few breaking changes it\x27s fine". Lead authorized HybridOneSDK.swift and a separate benchmark fixture; single shared prebuild/pod install will be run by s50803 after fixtures are ready.

TESTED: dc39fb8b5 removes JSON from call/callSync/callAsync/callFunction and callbacks. 13 wire tests pass, strict wire TypeScript check and simulator SDK runtime Swift typecheck pass. Native build/benchmark pending lead combined prebuild. Simulator owned: 33BF8DD9-9D93-42E3-BE7A-459056FD3578; evidence /tmp/one-sdk-wire-s51004. CI owner ci-manager.

TESTED: 94495694b adds useSDKProperty/useSDKPublisher/useSDKAsyncSequence and generic native KVO/Observation/Combine/AsyncSequence cancellation. Native simulator probe PASS across all four modes; 18 JS tests and strict TS pass. Generated Foundation 8437 entries and UIKit 9318 compile. db8ec5208 separate fixture waits for s50803 combined build/pods. Baseline screenshot records 30.629us JSON HK string getter vs 0.515us direct string getter; getters differ in native source. CI owner ci-manager.

Waiting for s50803 combined prebuild/pod regeneration to validate full app. Own source commits all pushed: dc39fb8b5, db8ec5208, 94495694b, 380f90265. Retain simulator clone 33BF8DD9-9D93-42E3-BE7A-459056FD3578 with live owner s51004 for pending before/after benchmark and React UI proof. No owned dev server or DerivedData created. Evidence retained outside tree at /Users/n8/.team-machine/results/one-sdk-wire-s51004. Shared tree stays with lead and other helpers. Needs full app native build and benchmark, UI hook proof, relevant generated declaration commit, cleanup, final handoff; do not mark done.

0ad4e9da6 ships generated runtime declarations (strict TypeScript check passed). Shared prebuild/pods is ready. Initial own DerivedData build was refused before execution because heavy queue/load ceiling; exact detached build watcher now queues once with normal admission. No benchmark parity claim yet. Simulator/evidence remain owned by s51004 for pending full app proof.

First native build failed before compilation: Xcode 27 rejects existing pod deployment targets 4.3/9/13.4. Rerun uses command-line IPHONEOS_DEPLOYMENT_TARGET=17.0 (runtime minimum), preserving shared project files.

8d36a972c fixes native C++ header visibility: One.podspec prefix includes installed Nitro AnyMapUtils.hpp, which declares SharedAnyMap referenced by generated One-Swift.h. Lead explicitly authorized that one source string. Ruby and clang++ alias syntax probes pass. Own full build watcher cancelled before shared pod refresh; await s50803 refreshed project.

8d36a972c header fix cleared SharedAnyMap errors. Next full build stops at React explicit precompiled module non-modular headers. Generated SDK pod lacks One target equivalent non-modular-header policy; lead notified for app.ts pod_target_xcconfig ownership. Own build script now can apply existing One policy globally to diagnose without shared project mutation. Await current-project signal after view-host file moves.

Fresh Clang module path still lacked SharedAnyMap because prefix headers do not reach One.pcm. Current source fix: new public ios/SDK/OneSDKBridge.h and One.podspec public_header_files entry, reused by prefix path. Ruby syntax and real clang -fmodules import/alias probe pass. Await s50803 fresh shared pod install to prove One umbrella includes new header; lead owns shared project and pod install. No shared generated project edited by helper.

5ae7f1c58 pushed: public SDK header fixes One.pcm visibility, proven after fresh lead pod install and own One.pcm generation. Full build reached OneSDKBindings Foundation/HealthKit then hit 45m watcher deadline; source errors absent. Evidence header-module-build.log retained outside tree. Resume incremental build for final benchmark/UI proof.

RAN: own DerivedData Build/XCBuildData directory disappeared during lead prebuild while build ran; disk129GB free. INFERRED prebuild replacing ios deletes DD under it. Asked lead to authorize DerivedData outside ios at ~/.cache/one/dd-sdk-wire-s51004 to prevent repeated invalidation. Current full proof pending build recovery and refreshed project; all own source committed and pushed.

Confirmed by s50803: full shared prebuild deletes ios and all prior DerivedData folders within it. Lead changed lane rule: own DerivedData now tests/native-features/build/dd-sdk-wire-s51004, never ios/. Own damaged remnant moved by lead to tests/native-features/build/dd-sdk-wire-s51004-damaged; remove at cleanup. Wait refreshed project, then cold build in durable location. No source regression found.

Owned native build now runs in managed exec session84241, separate from completion watcher, using tests/native-features/build/dd-sdk-wire-s51004. Prior nohup launcher did not survive parent execution and produced no result; do not treat that watcher interval as compile evidence. No current source failure. All source changes pushed. Remaining: actual app build result, simulator value benchmark, React Progress updates/unmount proof, cleanup and handoff.

RAN: managed native build finished exit 1 after 28m; first error missing packages/one/ios/OneNativeLabeledContentComponentView.mm, now moved to ios/Generated by view-host lane. Own DD tests/native-features/build/dd-sdk-wire-s51004 preserved. Compiler and completion watcher exited; no owned build running. Exact blocker sent to s50803; awaiting refreshed project before incremental rebuild. Transport/header code committed and pushed; full native benchmark and hooks screen proof remain pending.

Shared refresh done at worktree-hosts received from s50803. Incremental build restarted in managed exec session 96818 against preserved build/dd-sdk-wire-s51004; separate exact completion watcher will wait for build-result.txt.

RAN: full native build passed after worktree-hosts refresh. Maestro passed native Progress 0 -> 0.25, unmount, mutation, remount -> 0.5. Eighteen wire/store tests pass. Same HealthKit getter JSON 30.629 us -> Nitro values 16.203 us (47.1% reduction). Generated low-power getter 16.142 us vs direct asynchronous Battery 19.580 us; async overhead prevents claiming synchronous parity. Generated UserDefaults read/write 21.350/81.067 us vs direct C++ Storage 0.364/0.466 us. Direct C++ parity unmet: generic map conversion/Swift dispatch remains, with different native store work. Complete numbers and limitations committed in sdk/README.md. Final proof commit 80b893172 pushed and remote confirmed. Evidence and app retained at /Users/n8/.team-machine/results/one-sdk-wire-s51004 for review owner s50803; CI router ci-manager owns broader checks. No production check required, branch remains draft and unmerged. Cleaning own simulator and DerivedData; shared checkout and lead port 8081 retained.

Review fixes by successor s51663. Pushed fc9a360e8 shared observable predicate, validated 1754 Foundation IDs match native/cached facade registration. TESTED baseline wire and hook regressions fail before fixes (including singleton resubscription loop); fixed tests 21/21 and targeted strict TypeScript pass. Stable native identity and shared sequence code ready for simulator validation. Native compilation admission initially refused with 0.2 available cores; one exact queued native validation/build follows. CI owner ci-manager; review s50803.

Pushed 48ea7e36e (JS stable identity cache, unified hook store, non-finite numbers, regression tests and honest baseline configuration documentation), 247ad272e (native identity/sequence hub, Swift probe, singleton fixture and declarations; marked wip pending native validation). RAN Swift parser and targeted strict TS/declaration emission pass. Lead s50803 requested ready-for-prebuild and owns shared app SDK refresh; no app writer/pod/prebuild run by this helper. Retained simulator FEF5A94E-6837-4C37-A15B-C1B9438934E0, owner s51663, for upcoming native probe/UI proof. Shared checkout and server retained by s50803.

TESTED: w-cefb5a native compile and simulator execution passed. Before probe confirmed AsyncStream partitioning and cancellation/remount failure. Fixed probe passed native reference identity and stream fanout, independent cancellation, replay/continued remount and handle-release task cancellation, plus existing KVO/Observation/Combine teardown. Proof documented in 6f73be1d2. No shared SDK writer run. Ready-for-prebuild 247ad272e sent to s50803; waiting on his response after s51006 build finishes. Own simulator retained for final app/UI validation, no own DerivedData created yet.

Shared refresh at 247ad272e confirmed by s50803. Native validation probes already passed. Starting isolated Debug xcodebuild in tests/native-features/build/dd-sdk-wire, simulator FEF5A94E-6837-4C37-A15B-C1B9438934E0; exact build watcher owns completion. No shared app SDK writer, prebuild or pod install performed by helper. Pending final singleton/Progress Maestro flow prepared in retained evidence.

TESTED full isolated Debug native app build passed at refreshed 247ad272e. Maestro on own iOS 27 simulator passed ProcessInfo singleton thermalState value, same wrapper identity across two requested rerenders, Progress 0 -> 0.25, unmount/mutate/remount -> 0.5 and singleton remount. First deep-link run stopped on iOS Open confirmation; confirming that dialog allowed all assertions to pass. Screenshot singleton-and-progress.webp is 1206x2622 and 58690 bytes. Current binary benchmark next; CI owner ci-manager and review s50803 unchanged.

Final 42cb3ea3f pushed and remote verified. Full isolated Debug build, native before/fixed probes, singleton/Progress Maestro screen proof and current benchmark passed; 21 wire/store/renderer tests and strict targeted TS passed. Direct C++ parity remains unmet with cause/measurement limitations in README. CI router ci-manager owns PR 961 broader checks; no CI watch or production check owned here. Shared screenshot 1206x2622. Own simulator and DerivedData removed; no active owned wait/build. Shared worktree/server and lead-generated d.ts source-map tails retained for s50803. Evidence and replay app retained at /Users/n8/.team-machine/results/one-sdk-wire-s51663 with review owner s50803. Final handoff in that directory under 4KB.
