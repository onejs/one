---
id: t-mvms2ic8-1z3n0
title: Compile the unforked React Native core on Windows
status: done
owner_status:
  state: needs
  text: lead s69213 review of tm/windows-core-review 8240f9d2f5 (repairs) + 5c0a634df8 (validation); proof windows-2025 run 40132125554 9/9 PASS; evidence pro-128 ~/.team-machine/evidence/one-windows-core-review
  updated_at: 1792875900094
assignees:
- s69213
labels:
- one-native-desktop
- umbrella:one-native
- windows
backend: git
sessions:
- p110352
- r125629
- s75828
commits:
- 5c0a634df8edcd1cb1f2b237724c7ae6da8f70b4
- 8240f9d2f5c9bd9a616700adb83de7a6a80b052b
- e480b0f763768b1e6cf28c0645015370565659cd
created_at: 1792869264728
updated_at: 1792876016540
field_marks:
  active_form: 1792869264728
  assigned:r125629: 1792869610612
  assigned:s69213: 1792874592642
  assigned:s75828: 1792869375891
  body: 1792876016238
  claim: 1792874576936
  claim_current:c3d22a14608c3cb404690a90bf0fc764: 1792874576936
  ? claim_state:13c5123aa4da11fb63a1d6ab31c42e64:1792869621533:=r125629:=mc-12ehvc19fsga:1792869621533:o:4e766cd8b86bf6db639e19a6d28cfacd
  : 1792869621533
  claim_state:4e766cd8b86bf6db639e19a6d28cfacd:1792869494853:~:~:~:o:cb2e928f6b0d45b97d514ab1820637c7: 1792869494853
  claim_state:71112602845be3ce9dc171ef1a5b64ce:1792869370271:=s75828:=mc-3aa87nk0z4j17:1792869370271:f: 1792869370271
  claim_state:c3d22a14608c3cb404690a90bf0fc764:1792874576936:~:~:~:o:13c5123aa4da11fb63a1d6ab31c42e64: 1792874576936
  claim_state:cb2e928f6b0d45b97d514ab1820637c7:1792869483337:~:~:~:o:71112602845be3ce9dc171ef1a5b64ce: 1792869483337
  commit_linked:5c0a634df8edcd1cb1f2b237724c7ae6da8f70b4: 1792876016540
  commit_linked:8240f9d2f5c9bd9a616700adb83de7a6a80b052b: 1792875900788
  commit_linked:e480b0f763768b1e6cf28c0645015370565659cd: 1792874573116
  evidence_summary: 1792869264728
  owner_status: 1792875900095
  parent: 1792869264728
  priority: 1792869264728
  recovery_ref: 1792869264728
  status: 1792876016238
  title: 1792869264728
  unassigned:r125629: 1792874592642
  unassigned:s75828: 1792869610612
---
Continue owner-authorized Windows assessment t-mvmocix5-mjs0 with bounded M0 feasibility source. Build installed RN0.88 ReactCommon, pinned Hermes and dependencies using clang-cl on actual Windows; headless smoke must evaluate a bundle and exercise Fabric tree layout. Reuse Linux native-core exact d35f3f285dde9d9617d415d2af35067644d49685 read-only instead of duplicating its unit list/runtime. Keep live Mac/Linux producers untouched; Windows-only source/workflow slice in a fresh managed One branch. Record precise unforked-source failures if a blocker prevents smoke; no silent source patches. Existing public Windows hosted runner only, no new paid resource. No full Windows UI port, Nitro upgrade, native-core extraction, main merge or release. Lead69213 reviews source and focused proof; CI103700 owns broader normal checks. Opus high continuation of the owner-requested Windows lane. Plan and scope audit: lead69213 windows-nitro evidence. Windows probe source f65c17c8f5 retained; no same-surface worker active.

Confirmed launch s75828 (Opus5.5 high), parent69213, on studio-64 through normal placement; exact launch receipt in lead windows-nitro/m0-launch.json. One Windows M0 source writer only, replacing completed m57704. Prior plan commit c3774165e22 queued via normal Contrast train; raw summary inspected and recommendation/source scope audited. Own existing Mac release work remains separate and held.

RAN launch s75828 confirmed Opus5.5 high on studio-64, but actual managed root was /Volumes/Samsung-1TB-990/worktrees/one-windows-core-smoke rather than required ~/.worktrees/one-*. Lead discovered after launch; tm show changes returned empty. Sent bounded source-location conflict directive: preserve any authored source, no additional edits/builds/dispatch, finish with technical/resource handoff for parent successor on compliant host. No fleet config edits, tree moves or duplicate launch. Task t-mvms2ic8-1z3n0 stays lead-owned in progress; wait w-a3177e armed for this exact handoff. The Windows lane is not canceled. Architecture assessment completed/shared; M0 source not yet accepted.

# Windows M0 handoff (t-mvms2ic8-1z3n0)

Stopped at the lead's request (s69213) because the managed tree was created outside ~/.worktrees/one-*. The task moves to another location. It is not cancelled.

## Source and resource state
- Tree /Volumes/Samsung-1TB-990/worktrees/one-windows-core-smoke, local branch tm/windows-core-smoke at origin/main efbe39548a. It is clean, has no commits and was never pushed. tm worktree remove reported "kept" only because this session's own processes hold the tree. It is released when this session exits.
- Nothing authored, built or dispatched. No CI runs, waits, processes or claims are open. node_modules was never installed.

## Findings (all from reading source, nothing ran)
- READ: the shared core is at onejs/one d35f3f285dde: packages/one/native-core/rn-core.cmake (RN_DIRS unit list plus RN_SOURCES glob, with tests/android/windows/fantom excluded) and host/OneHostRuntime.{h,cpp} and OneHostModules.{h,cpp}. The Windows build should include rn-core.cmake from a read-only checkout of that SHA and reuse OneHostRuntime, OneMessageQueueThread and OneTimerRegistry, with Windows subclasses only.
- READ: the Linux smoke (packages/one/linux/smoke/main.cpp) only evaluates bytecode (smokeDone(6*7, typeof HermesInternal)) and builds a Scheduler with 8 descriptors. It never starts a surface or lays out a tree, so it does not meet M0's "lays out a Fabric tree". INFERRED next step: OneHostRuntime::createScheduler, updateLayout(w,h,1) and startSurface. Then a JS bundle defines RN$AppRegistry.runApplication, which calls nativeFabricUIManager createNode, createChildSet, appendChildToSet and completeRoot with flex and padding styles. schedulerDidFinishTransaction pulls the MountingCoordinator transaction and asserts the Yoga frames. A bundle with real React would be stronger but needs a bundler step.
- READ: Linux-only inputs that Windows has to replace in its own target:
  - GTK4/Pango TextLayoutManager and OneLinuxImageManager. Use RN's platform/cxx textlayoutmanager and imagemanager instead.
  - AppleEventBeat.cpp, which may be reusable.
  - GCC-style `-include` and `-iquote` options. clang-cl needs `/FI` and `-imsvc`/`/I`.
  - The OneLinuxThreadName pthread shim (only for worklets; skip Nitro, worklets and op-sqlite in M0).
  - libhermesvm.so is hardcoded. Windows needs hermesvm.dll plus its import .lib.
  - prepare-deps.sh uses bash, `tar --wildcards` and sed.
- GUESSED, to settle first: the likeliest failure points are dependencies, not ReactCommon.
  - glog's ReactAndroid CMakeLists and config.h target Android. Windows glog needs src/windows/port.h.
  - folly's ReactAndroid source list may need folly/portability Windows units.
  - Hermes needs clang-cl/MSVC flags.
  - Disproved if all three build unmodified with clang-cl.
- READ: pins. bun.lock has react-native@0.88.0 sha512-v/wee0nYWcammMYBnSat/e3WY/5iaf9YQOMcBrfKT/wPApPPlHp94hgZovBtwhMuthR01yc/8cGn0FpFTE/C4A== and hermes-compiler 260318099.0.4. The Hermes tag comes from RN's sdks/hermes-engine/version.properties and the dependency pins from gradle/libs.versions.toml. I did not read either.
- READ: the runner pattern is in tm/one-windows-probe f65c17c8f5 .github/workflows/windows-probe.yml (windows-2025, push-triggered on its own branch, upload-artifact). The plan is in Contrast c3774165e22 plans/contrast/one-windows-native.md, M0 at line 145 and the falsifier at line 102.

## Next
Start a fresh worker in a correctly placed tree with this file. The M0 acceptance has not changed.

Location succession complete: previous s75828 handed off zero edits/builds/dispatch; its clean unused tree is already auto-removed (parent removal found no Git worktree; filesystem absent). Pro-64 policy independently read worktree_root=/Users/n8/.worktrees. Single successor r125629 launched Opus5.5 high, parent69213, exact receipt m0-successor-launch.json; lost remote reply recovered via canonical lt-e30e4571b0b285522e657ad5dad1ce7d, no duplicate. Brief retains actual Fabric/Yoga layout acceptance; no merely registering Scheduler counted. Original same one Windows M0 slot.

# Windows M0 handoff (t-mvms2ic8-1z3n0)

M0 PASSED on GitHub windows-2025 (free runner). Source is ready for lead s69213 review; nothing is integrated.

## Source
- onejs/one branch tm/windows-core-m0, head e480b0f763 (8 commits on main efbe39548a), pushed.
- Owned paths: packages/one/windows/** (scripts/*.ps1, cpp/CMakeLists.txt, cpp/deps/**, smoke/main.cpp, smoke/smoke.js, README.md) and .github/workflows/windows-core.yml (push-triggered on this branch only).
- Shared core: rn-core.cmake and native-core/host from onejs/one d35f3f285dde (tm/one-linux-native), checked out read-only in CI through NATIVE_CORE. Not copied or edited. Integration prerequisite: the Linux foundation lands on main, after which NATIVE_CORE defaults to ../native-core and the extra checkout goes away.

## Proof (RAN, run 40130192291, green; earlier green run 40128461113 too)
- RN 0.88.0 npm tarball matches the bun.lock sha512. Hermes 260318099.0.4. Deps from RN's libs.versions.toml: boost 1.83.0, double-conversion 1.1.6, fast_float 8.0.0, fmt 12.1.0, folly 2024.11.18.00, glog 0.3.5.
- Toolchain: clang-cl 22.1.3, MSVC 14.51.36231 STL, Windows SDK 10.0.26100, VS 18.11.1, CMake 4.4.4, Ninja 1.13.2.
- All 311 shared-list units, the 3 Windows additions (OSCompatWindows, cxx TextLayoutManager, cxx ImageManager) and the 2 shared host units compile with clang-cl. No RN source edits, no -Werror waivers, and 1 warning (strerror deprecated). I checked the compiled list against the shared list unit by unit.
- Smoke: shared OneHostRuntime, Scheduler, surface 800x600, a Hermes bytecode bundle (sanity-checked, v99), and a tree built through nativeFabricUIManager. The mounting transaction gives frames 2{0,0,800,600} 4{20,20,100,50} 6{130,20,450,50} Paragraph 8{580,20,200,560}, all matching. Controls: padding 30 fails with 3 mismatches, and JS source is rejected as not bytecode.
- Hashes (sha256): smoke.exe 68C2B0DA…960F, smoke.hbc B39A19BE…128C, hermesvm.dll 5E4BFD36…F599, OneWindowsCore.lib B14986E9…4011 (full list in run-40130192291/hashes.txt).
- Evidence: ~/.team-machine/evidence/one-windows-core-m0/ holds run-40130192291/ (logs, versions, smoke and negative output, bin/ with exe, hbc and dll) and failures/ (the full Hermes clang-cl and folly-demangle failure logs). The GitHub artifact windows-core is on the run too.

## Findings
- Hermes at this tag does not build with clang-cl (run 40126302437): Hermes.cmake adds -Werror=undef for clang-cl (GCC_COMPATIBLE), and llvh Compiler.h:335 and MathExtras.h test `#if __GNUC__` (30 errors). Hermes is therefore built with MSVC cl, as in Hermes's own Windows CI; it shares the ABI with the clang-cl core. Minimal upstream fix: `#if defined(__GNUC__) && __GNUC__`, or skipping hermes_enable_werror_undef under CLANG_CL. Not filed upstream.
- Shared-core boundary: rn-core.cmake's `(Windows|CdpNetworkDummy)\.cpp$` filter drops OSCompatWindows.cpp, the only Windows oscompat implementation. The Windows target re-adds it. The shared list could keep it (it compiles to nothing on POSIX). That change belongs to the native-core owner, not me.
- glog 0.3.5's own CMake exports its private src dir, and folly took its demangle.h for libiberty's. The deps build now exposes only glog's public headers. folly uses RN's Android unit list plus folly Windows portability units, without the Android POSIX/libc++ flags.
- Release config only. Debug (HERMES_ENABLE_DEBUGGER) and timing were out of M0 scope and not run.

## Not done (out of scope)
Window, controls, the JS `windows` platform, Nitro, the startup benchmark, a real React bundle, Debug config.

## Resources
No processes, claims or waits are open. Hermes cache entry hermes-260318099.0.4-release-cl-* is on the Actions cache. The worktree is clean and pushed; its untracked .build/ predates this session and is not mine.

# Windows M0 source and saved proof review

Reviewed e480b0f763768b1e6cf28c0645015370565659cd against efbe39548a. The source reuses native-core d35f3f285dde without copying its runtime or unit list. Lead read all build scripts, CMake targets, smoke and experimental workflow, plus saved actual Windows positive/negative output and hashes on pro-64. No fresh lead Windows build is claimed.

The recorded M0 result holds: RN0.88 core compiled with clang-cl, Hermes with MSVC cl, HBC99 executed and produced the asserted Fabric/Yoga frames. The saved padding30 output actually loaded bytecode and showed three frame mismatches; the JS-source control rejected its input. This is headless, not a real React bundle, window, controls, Debug or performance proof. Hermes clang-cl failure remains an explicit limitation rather than a hidden source patch.

Two bounded corrections before reusable source acceptance:

1. The workflow compiles negative.hbc without checking hermesc exit status. A compiler failure can fall through to smoke's invalid/missing-bytecode rejection, which also exits1, falsely satisfying the layout-negative gate. Fail on the compiler exit before invoking smoke. Reuse the existing native command helper or an explicit exit check. Prove a compiler failure stops at that boundary; retain the actual wrong-layout and source controls. The saved existing negative was valid, so this finding does not revoke that execution result.
2. prepare-deps.ps1 removes the entire existing Out directory when the version stamp is missing or mismatched. Preserve existing cache contents and fail clearly for a conflicting/incomplete destination, or use a new staged destination without deleting the prior directory. A clear refusal is adequate; no cache repair framework is needed. Prove a sentinel survives both incomplete and mismatched destinations, and a matching stamped cache remains reusable. No cache deletion is approved.

Also correct the workflow header: Hermes uses cl, not clang-cl. No RN/native-core changes, new dependency major, Nitro migration, release or product API is needed. Shared-core integration still belongs to its Linux owner and is a later prerequisite. The Windows M0 worktree was automatically removed after the worker exit; durable evidence and the pushed branch remain. A fresh bounded continuation must preserve authorship and source.

Lead source review accepted recorded M0 execution with compiler qualification; two bounded script repairs remain, detailed in lead windows-nitro/m0-lead-review.md. Original r125629 exited, old managed tree auto-removed; durable source/evidence preserved. Sole correction launch: pro64 refused due pending quiet measurement (no session started), then pro128 pending canonical lt-2ca2ca5af872cd83782f6ef9f8f4178f. Parent owns exact launch event, no duplicate; M1/UI/Nitro not in this unit. Task update locally durable; publication may queue.

Confirmed correction author p110352, Opus5.5 HIGH, parent69213, live on pro128 in compliant /Users/n8/.worktrees/one-windows-core-review. Canonical pending launch recovered once; no duplicate. Worker has read source and owns bounded two-script repair/proof, not M1/Nitro. Lead review and source integration remain separate from held Mac batch. Original M0 worker/tree exited/auto-removed; durable proof retained on pro64.

# Windows M0 lead recheck

APPROVED: tm/windows-core-review 5c0a634df8, repair 8240f9d2f5 over e480b0f763. Lead read the two-file diff, actual PowerShell probe source and saved Windows run40132125554 results/failure output. No fresh lead Windows execution or full rebuild claimed.

The compiler exit guard runs before the negative smoke; reason-specific assertions retain the actual layout/source rejection boundaries. The probe extracts and executes the source workflow smoke text with saved actual M0 binaries. Before, deliberate malformed input falsely passes; after, hermesc exit2 stops before the smoke; real positive and both negative controls pass. Hash-list placeholder files and a no-op build step are explicit probe substitutions, not a new core build claim.

Dependency layout uses a sibling staging directory, stamps it before publication, refuses mismatched/nonempty unstamped existing output, and reuses matching output. Probe9/9 passes show sentinel bytes preserved, intermediate failure cleanup and fresh/reused output. No repeated RN/Hermes rebuild needed for these script paths. Original core run40130192291 remains the compiler/runtime proof.

M0 core feasibility experiment is complete and reviewed. Source is pushed, not integrated into held Mac PR1027 or main. Linux native-core exact d35f3f285dde remains its explicit read-only foundation/integration prerequisite. Hermes requires MSVC cl while RN core uses clang-cl. No actual React, window, controls, Debug or timing is established by M0. The next bounded engineering probe is a Composition window with one child WinUI island, not full M1 acceptance or a Nitro migration.
