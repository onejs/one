---
id: t-mviouui6-a920
title: Complete One Android CI cache and observer repairs
status: done
owner_status:
  state: needs
  text: parent same m50768 final delta review and CI p96184; source proof complete, run39694577945 system job119553894069 remains downstream
  updated_at: 1792628600135
assignees:
- r110538
labels:
- lane:one-android-ci
- umbrella:oss-maintenance
parent_id: t-mvb8ssec-1zj00
backend: git
sessions:
- r116388
commits:
- 383888ee4ab4d2de5431425c4a563a57e31011c0
- b4998e330c4d0fae04cb7280b36262e935ecad67
created_at: 1792622003694
updated_at: 1792630248805
field_marks:
  active_form: 1792622003694
  assigned:r110538: 1792628600135
  body: 1792630248805
  claim: 1792622003694
  commit_linked:383888ee4ab4d2de5431425c4a563a57e31011c0: 1792622130223
  commit_linked:b4998e330c4d0fae04cb7280b36262e935ecad67: 1792622130070
  evidence_summary: 1792622003694
  owner_status: 1792628600135
  parent: 1792622003694
  priority: 1792622003694
  recovery_ref: 1792622003694
  status: 1792630248805
  title: 1792622003694
  unassigned:r116388: 1792628600135
---
Successor to p100604, parent r110538. PR1003 original branch tm/android-sdk-package-cache, PR1005 tm/android-hide-error-dialogs. CI p96184; final reviewer same m50768 via parent. Scoped workflow/action changes, normal pushes, preserve commits, no merge. Cache producer 39684736046 active; inspect once, then confirm actual NDK and whole-package save/restore. Repair observer/read/grep fail-closed behavior and run exact-loop mocked probes. No new native producer or automated tests.

TESTED observer exact-loop disposable probes: original adb read failure exits 0; repaired clean/foreign/prefix/suffix/payload events pass, fixture crash/ANR/subprocess plus CLI17/clear/read/grep/file errors fail with artifacts. actionlint and diff checks pass. Evidence outside tree ~/.team-machine/coordinator/updates/one-android-ci-successor-evidence. RAN compile job 119515810813 from existing 39684736046 confirms Gradle self-install NDK28.2; root/app/One use27.1, WebGPU omits pin, so both now listed. Cache corrected whole-list runtime proof still required.

Pushed original branches normally, author commits preserved: PR1003 b4998e330c4d0fae04cb7280b36262e935ecad67; PR1005 383888ee4ab4d2de5431425c4a563a57e31011c0. Same m50768 final review remains parent-owned. Only CI workflow changed. Source validation retained pending prerequisite producer terminal and corrected save/restore proof; no device producer.

RAN existing expanded runtime producer39684736046 finished SUCCESS at original88e9f2f60e. Corrected dual-NDK branch b4998e330c dispatched only after terminal receipt. Full original compile log retained; follow corrected cache save and later restore sequentially. No new native/device producer.

RAN dual-NDK save39690046073 SUCCESS. Compile119533696988 cache MISS then saved android-sdk-Linux-7c9b86b26bca86f7-545b318664a1ae52; setup-android installed both27.1/28.2 before Gradle. Compile BUILD SUCCESSFUL, no Gradle Preparing/Install NDK lines. Sequential restore39694577945 now dispatched at same b4998e330c. Existing fixture whole-list restore39684736046/119521862553 confirmed android-sdk-Linux-dee3616c612d4d8f-aa853f35a6dc9486. No predicates/budgets/retries changed.

RAN natural PR39687469179 compose-a119530726116: whole fixture list and correct system-images/android-37.0/google_apis/x86_64 path keyed dee3616c612d4d8f; lookup explicitly MISS22:48:56, removal/restore skipped, then sdkmanager downloaded image and failed SeekableByteChannel22:49:52 before fixtures. RAN cache API currently shows sole matching entry9305265723 scoped refs/heads/tm/android-sdk-package-cache, created21:42:00; no default/base-scope entry returned. INFERRED branch/PR cache visibility explains cold PR vs successful branch dispatch restore, not missing package/path. This mitigation leaves cold misses/eviction exposed to sdkmanager transport failure; success on warm dispatch does not prove PR setup fixed. Counterevidence would be accessible matching cache version/key at failure time plus restore skip. Official scope reference https://docs.github.com/en/actions/reference/workflows-and-actions/dependency-caching#restrictions-for-accessing-a-cache . Current serial restore39694577945 unchanged; no new producer requested.

RAN corrected restore39694577945 compile119548733160 SUCCESS: restored exact saved key android-sdk-Linux-7c9b86b26bca86f7-545b318664a1ae52 (six build package directories, both NDKs), Gradle BUILD SUCCESSFUL11m23s with no Preparing/Installing NDK. Fixture launch119553894046 SUCCESS restored dee3616c612d4d8f-aa853f35a6dc9486 full five-package fixture list. At timeout, compile+5fixture jobs successful; only system119553894069 still running. Whole run is NOT claimed green. w-b9a84a timed out, no live watcher transferred. Parent/CI owns exact terminal followup. Parent says PR1005 already merged after same-chain approval/all9green. No further1005 work.

Handoff ~/.team-machine/coordinator/updates/oss-one-android-ci-successor.md (<4KB), owner closeout shared. Source implementation complete and published. Managed worktree removal returned kept only for own session processes, automatic release at exit; clean tree, no live owned watchers/services/children. Parent r110538 and CI p96184 own remaining review/run39694577945 system119553894069/followup t-mviss8ad-z8b0.

APPROVED final PR1003 source delta at b4998e330c4d0fae04cb7280b36262e935ecad67 by m51809, over prior approved88e9f2f60e. RAN diff/action/callers and TESTED six extracted-shell cases: both NDK paths, prior bundle key invalidation, restore/save prefix equality, NDK28 revision suffix sensitivity, unchanged fixture bundle and cold restore. No new blocker or simplification debt; no source edit/push/build/CI query. Evidence ~/.team-machine/evidence/oss-one1003-review/delta-m51809/review.md. Parent-reported warm-run success remains relayed; natural39687469179 cold MISS/archive FAIL remains CI p96184 required disposition, not waived. r110538 retains merge custody.

CIqualification: sourceproofcomplete withfeedreportedexactb4998 save+restoreall7SUCCESS. RequiredPR39687469179 remainsFAIL; independentdispatchproofdoesnotfulfillrequiredcheck orcoldmiss transportrecovery. Existingr110538 retains merge/event custody andm50170samechaindeltareview, no newproducer/autorerun/reviewer. Productionfollowupt-mviss8ad records exact acceptance limits; noCIimplementationtakeover.

One1003 merged normal merge1c2d93381f6758f7d03c8db6ca94045f1126c288 from exactb4998e330c4d0fae04cb7280b36262e935ecad67 after same-chain m51809 approval and parent all9terminalSUCCESS/CLEAN qualification. RequiredPR39687469179 recovered after its ONE authorized failed-job SDKsetup retry; branch SAVE/RESTORE independently qualified. One1005 alreadymergedf8be0a8114770212308e2ad1d72525e482e6716d. Both CI-only/no release. Worker116388 finished clean/published; removal deferred only ownexit process, external evidence retained. Production followupt-mviss8ad-z8b0 with CI96184 remains open for main-cache seed and subsequent PR restore; cold or evicted cache downloader failures remain possible.
