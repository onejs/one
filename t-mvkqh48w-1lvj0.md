---
id: t-mvkqh48w-1lvj0
title: Register native idle callbacks for the Mac consumer
status: done
active_form: upstream module registration ready; focused incremental native build queued under heavy admission w-c3d57c; real RN global callback probe prepared outside tree
owner_status:
  state: landed
  text: pushed 61cda88399 on tm/macos-resume; native idle deadline, cancellation, timeout and reload proof passed; s69213 owns consumer acceptance, ci-manager owns pushed workflows
  updated_at: 1792746493883
labels:
- lane:one-macos
- umbrella:one-macos-native
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69517
- s69529
commits:
- 61cda883993b9b72d407f85c05814fdaa9e92fb1
created_at: 1792745654720
updated_at: 1792746579128
field_marks:
  active_form: 1792745789039
  body: 1792746579128
  claim: 1792746562120
  claim_current:78baedc0842e979ce9237cf2bdb1d88a: 1792746562120
  ? claim_state:606c36e9e0c5dc865b656c78bfe35138:1792745712128:=s69517:=mc-3aa87nk0z4j17:1792745712128:o:91f4b8a966cd53a997e541d254c05fe3
  : 1792745712128
  claim_state:78baedc0842e979ce9237cf2bdb1d88a:1792746562120:~:~:~:o:ed55927ded734dea48aebaacd564eaed: 1792746562120
  claim_state:91f4b8a966cd53a997e541d254c05fe3:1792745684738:=s69517:=mc-3aa87nk0z4j17:1792745684738:f: 1792745684738
  ? claim_state:ed55927ded734dea48aebaacd564eaed:1792746048437:=s69529:=mc-3aa87nk0z4j17:1792746048437:o:606c36e9e0c5dc865b656c78bfe35138
  : 1792746048437
  commit_linked:61cda883993b9b72d407f85c05814fdaa9e92fb1: 1792746462800
  evidence_summary: 1792745654720
  owner_status: 1792746493883
  parent: 1792745654720
  priority: 1792745654720
  recovery_ref: 1792745654720
  status: 1792746493883
  title: 1792745654720
---
RAN consumer s69465 reaches live rows and feed on a30893b0ed but RN throws missing NativeIdleCallbacksCxx. Register upstream RN NativeIdleCallbacks and compile its existing source. Keep consumer unshimmed. Targeted native scheduling, cancellation and reload proof, then push producer branch. Lead owns consumer acceptance; ci-manager owns normal pushed workflows.

Native idle callback blocker fixed on origin/tm/macos-resume, commit 61cda88399 (remote verified). Task t-mvkqh48w-1lvj0. Only packages/one/macos/host/OneMacosModules.mm and packages/one/macos/cpp/CMakeLists.txt changed: compile installed RN idlecallbacks source, register NativeIdleCallbacksCxx using the existing CallInvoker. No shim or new scheduler, no main merge or publication.

TESTED: normal-admission incremental MacosBasic Debug build succeeded. Native LSUIElement harness used installed RN 0.88 globals; requestIdleCallback identity equals nativeModuleProxy.NativeIdleCallbacksCxx.requestIdleCallback. Two runtimes passed: actual deadline object with didTimeout false and roughly 49.98ms remaining; cancellation prevented callback after 100ms; timeout:1 after a 30ms busy period produced didTimeout true; timeout:0 remained false. DevSettings reload requested with 100 queued idle tasks, then second runtime repeated checks with no old callback after its first report. All 100 tasks drained before replacement, so this does not establish pending-task cancellation at runtime destruction. Foreground application unchanged; no cursor interaction. Consumer acceptance and broader platform matrix not run. Disproof: consumer still fails to resolve module against these exact native bytes, or the callback checks fail.

Evidence: /Users/n8/.team-machine/evidence/one-idlecallbacks contains build-resumed.log, runtime.log, result.txt, source/binary/bundle SHA256 provenance.json, probe.js and runner/server/watcher scripts. Inherited build interrupted on provider replacement; resumed build passed. First proof copy failed signing because copytree dereferenced framework symlinks; runner fixed to preserve symlinks, final native proof passed.

Retain source /Users/n8/.worktrees/one-macos-resume and warm outputs /Volumes/Samsung-1TB-990/builders/one-macos-resume for adopting lead s69213. Source clean/pushed; archive Build/Intermediates.noindex/OneMacosCore/build/libOneMacosCore.a and fixture Build/Products/Debug/MacosBasic.app. Background signed copy /Users/n8/Library/Caches/one-macos-idlecallbacks/MacosBasic.app retained for lead. All harness/server/log/build processes stopped and admission released; worker staleness watcher stopped. No children or active waits retained. Sibling native-controls tree untouched.

Lead s69213 owns consumer integration and independent review by s69465; ci-manager owns normal pushed workflows. Next: rebuild actual ControlRoom with this producer native source/archive and verify the missing idle module invariant is gone. No delivery watcher held by this worker.

Lead source read: commit61cda88399 is five lines across existing CMake RN directory list and factory include/registration, uses upstream RN module and existing invoker. Native evidence shows genuine deadline/cancel/timeout behavior; queued work drained before runtime replacement, so no pending-task destruction claim. Supplied exact producer to consumer s69465 for actual ControlRoom invariant disproof and independent Opus review.
