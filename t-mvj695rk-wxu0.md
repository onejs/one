---
id: t-mvj695rk-wxu0
title: Keep release preflight registry errors unknown until bounded recovery
status: done
labels:
- lane:one-release-preflight
- umbrella:beast119663
priority: 4
backend: git
sessions:
- r117168
commits:
- ad2bc8eb55a698b007737c54493010a3d4e7a14e
created_at: 1792651224944
updated_at: 1792652381770
field_marks:
  active_form: 1792651224944
  body: 1792651635672
  claim: 1792652381770
  claim_current:a344a20ece65e4ddeb120d2b77b7c4e6: 1792652381770
  claim_state:a344a20ece65e4ddeb120d2b77b7c4e6:1792652381770:~:~:~:o:bc86aaf57a6e64328cc9f9e255ae9e4c: 1792652381770
  claim_state:bc86aaf57a6e64328cc9f9e255ae9e4c:1792651245926:=r117168:=mc-12ehvc19fsga:1792651245926:f: 1792651245926
  commit_linked:ad2bc8eb55a698b007737c54493010a3d4e7a14e: 1792651545337
  evidence_summary: 1792651224944
  owner_status: 1792651224944
  parent: 1792651224944
  priority: 1792651224944
  recovery_ref: 1792651224944
  status: 1792651585520
  title: 1792651224944
---
Fix One release publisher preflight registry handling that directly blocks the reviewed SDK repair dependency. MEDIUM effort. Parentp103481 owns independent upstreamreview/PRmerge and gateacceptance; CIp96184 owns broaderCI. One branchPR only, no mainpush/stablepublish, no helper/reviewer spawning. REVIEW: parentp103481 within upstream required coverage.

RAN branchcanary39734416083 source d43e446cca89 SDKfixPR1008: attempt1 fails initial Checking24versions preflight release-publish.ts77 npm502 for @vxrn/vite-plugin-metro@2.0.0-0.canary.1792650705216; attempt2 sameinitialphase npm503 for create-vxrn@2.0.0-0.canary.1792650895313 after120s. Both BEFOREpublishwave, no SDKbuildfailure or missingoutput assumption. Retainedfailedlogs ONCE Studio/tmp/beast119663-one-canary-failed.log and -attempt2-failed.log, no refetch; source scripts/release-publish.ts initialpMap fails on any transientregistryerror while later verification already treats transientreadfailure as unknown untildeadline. Original authorp84640 source3a89357d Oct14 intentionally preserved fail-closed unknownregistry errors after prior false404 causedduplicateversions; preserve that contract. Parent allowed ONE unchangedfailedjobrerun which wasused, no third unchangedrerun. Sourcefix required.

Start source+actual retainedlog/read. Make preflight tolerate bounded transientregistry responses/transport hiccups, with boundedperrequest/wholeoperation timing if needed so24lookups cannot hang indefinitely. A transienterror is UNKNOWN, never missingversion: only genuine404 resolvesfalse; exhaustedretry/invalidmetadata/auth/permanentfailures must remain explicitfailure, never openpublishwave. Preserve exactversion checks, cachebust/no-cache and occupiedversionskip behavior, all24packagecoverage, dependency-before-entry publicationwave ordering and authcontract. Reuse existingowners/helpers where sound, avoid duplicate implementations/fallbacks/inventednetworksemantics. No publisher/inputbudgetgate weakening. Do not change unrelated releaseversion/protocol/features.

No new automatedtests forCI/releaseinfra. Validate real modified helper with one disposable mechanismprobe covering transient503->existing200, transient502->genuine404, repeatedtransientexhaustion/no publication, permanentauthfailure, malformedmetadata, boundedread and existingoccupiedversion/wavecontrols as meaningful. Run existing focusedchecks appropriate once, no broadbuild/testmatrix; builds/native/SDKcapture belong65565 notyou. Prepare coherentvalidatedbranchPR with proof and no newreviewgate. No release workflow dispatch until parentreview ofsourcefix; parent then owns ONE changedsourcecanaryevent. PreserveSDKPR1008source; currentmain may already containit, ifnot coordinateparent ratherthanmergeothers.

Finish whenimplementation/sourceproof complete and onlyPRdelivery remains, externalhandoffunder4KB withsource/PR/probe/remainingchecks/optimizationideas. Clean ownservices/waits/claims and removefinishedmanagedtree whilepreservingpublishedsource/evidence. No progress/completionmail, directparentblockeronly. RSIwas notifiedonce ofinitialfriction, this exacttask nowownsrepair so no duplicates.

RAN RSI 2026-10-22 06:46Z duplicate-owner audit after initial gate report: exact task and existing r117168 live record verified; current release-publish.ts preflight pMap propagates registry refusal, later verify catches read errors until deadline. Existing task already includes original 502/503 logs, independent source validation, fail-closed occupied/unknown contract and parent-owned source review. No duplicate task, new author, publisher edit, registry request, workflow rerun or release action by RSI. Parent gate owner p103481 and existing author retain lane.

Task t-mvj695rk-wxu0 implementation complete. PR https://github.com/onejs/one/pull/1009 targets main from tm/one-release-preflight. Pushed source ad2bc8eb55a698b007737c54493010a3d4e7a14e; scripts/release-publish.ts blob 4db89dbf9ac896c280a7b71e7fc2c5e1f60bd2ce. Only that source file changed.

RAN retained Studio logs locally through SSH: first failure Checking24 then HTTP502 @vxrn/vite-plugin-metro, second Checking24 then HTTP503 create-vxrn. No logs refetched from GitHub. Both precede publish waves.

Change: preflight attempt0 retries transport/body failures, timeouts and HTTP408/429/500/502/503/504 at most three reads, 15s per read including body, 1s spacing. Positive verification attempts retain their existing outer loop and get bounded reads. Only HTTP404 returns false; invalid/mismatched metadata and permanent/auth HTTP errors throw. Cache bust/no-cache preserved. Publication/auth/wave implementation untouched.

TESTED existing release-publish file: 18 pass/0 fail. Focused oxlint: zero warnings/errors. Formatting and diff check passed. Disposable helper probe: all16 controls pass, including503->existing200,502->404, transport recovery, exhaustion/no publication,401/403/400/501, malformed/null/missing/wrong-version metadata, unresponsive headers, actual HTTP stalled body, all24 lookups, occupied dependency/entry skips and dependency verification before entry wave; verification failure blocks entry. At shortened30ms deadline headers/body stopped after96/95ms across3 attempts. First focused run caught nested verification retries consuming its deadline; source corrected to preflight-only retries before final passing run.

INFERRED bound: 24 lookups at concurrency8 need at most3*(3*15s+2*1s)=141s plus scheduling. Disprove with a live read exceeding the deadline; body and fetch abort probes passed. No live npm recovery, workflow dispatch, build or SDK validation claimed.

Remaining: p103481 owns independent review/merge and ONE changed-source canary combining reviewedSDKPR1008/d43 with this exact publisher blob. Parent acknowledged SDK integration sequencing; no SDK source merged here. p96184 owns broaderCI; build/native/SDK captures remain65565. Existing review coverage only. Optimization: retain fixed bounds until live latency evidence justifies tuning; no parallel implementation suggested.

Evidence retained on pro-64 at /tmp/r117168-release-preflight/: probe.ts, probe.log, focused-check.log, pr-body.md, source.ts, handoff.md. No persistent services, children or waits started; disposableHTTPserver stopped. Managedtree cleanup follows; branch/source remain pushed.

Cleanup: managed removal reports held only by this session processes and release upon exit; clean published tree retained under r117168 until tm finish cleanup. Probe source/logs and incidental cache evidence preserved externally at /tmp/r117168-release-preflight. No services or waits remain.
