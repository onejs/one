---
id: t-mv8ps1qx-18qt0
title: Reduce One production build memory
status: done
owner_status:
  state: landed
  text: evidence-only review branch30ccdbb2f, draftPR887; Checks and Tests green; candidate discarded
  updated_at: 1792022967303
assignees:
- m33927
labels:
- branch:tm/one-start-build-memory-sol
- lane:one-start-build-memory
- umbrella:plans/contrast/tanstack-site-comparison.md
backend: git
commits:
- 30ccdbb2f
- 30ccdbb2f22847575d7d49a66eab7cd4444d2e9a
created_at: 1792018890969
updated_at: 1792022983155
field_marks:
  active_form: 1792018890969
  body: 1792022983155
  claim: 1792018890969
  commit_linked:30ccdbb2f: 1792022212581
  commit_linked:30ccdbb2f22847575d7d49a66eab7cd4444d2e9a: 1792022142379
  evidence_summary: 1792018890969
  owner_status: 1792022967303
  parent: 1792018890969
  priority: 1792018890969
  recovery_ref: 1792018890969
  status: 1792022967303
  title: 1792018890969
---
Profile unchanged production site first. Keep one cause only with >=3 alternating same-source measured pairs, speed and actual six-route dev/production behavior preserved. Independent of PR884. Worker owns CI; review none. 2026-10-14: profiling starting on local host.

RAN: locked install and normal release --into installed 17 original-source packages. Fixture source unchanged; symlinks restore tsconfig repository references. First two failed fixture builds and refused admissions are excluded. CI owner m33927; no source edits yet.

RAN: w-a5ed0e timed out after bundling (4.45s); CPU profile overwhelmingly idle, RSS peak1035MiB, no prerender workers reached. This partial run is excluded. No source change or completed-memory claim.

RAN: memory-only complete build12.97s, max-processRSS3535.3MiB; sampled peakRSS3532.9MiB. Before workers1017.6MiB, during workers3532.9MiB, after termination2565.8MiB. Eight isolate peaks121–188MiB heap plus roughly110MiB external each. INFERRED: worker import/highlighter duplication dominates candidate surface; no default-worker or output change chosen.

2026-10-14 candidate: replace buildPage import of Vite normalizePath with Node posix.normalize over joined platform separators. Allocation samples contain Vite/Rolldown modules in all eight worker isolates. This removes build-tool imports from prerender workers; keeps worker count/config/content unchanged. No shared source with PR884. Candidate packaging in progress; keep only after full same-source RSS reduction and identical output/behavior.

RAN diagnostic one pair: original3671719936bytes maxRSS /13691.9ms; candidate3677306880bytes /9857.5ms. No RSS reduction; elapsed timings not quiet and not used for a speed claim. Both emit same JS116415585/CSS500530/HTML167795245bytes across1496 client files, RN/RNW0. Frozen source hashes match. Final three alternating quiet local pairs will decide rejection; no further causes in this slice.

RAN final quiet3 pairs: maxRSS median3481.3(3456.5–3507.2)->3508.4(3432.8–3559.1)MiB; tree3456.2->3480.4MiB. Build median11034.9(8164.8–11696.1)->9163.8(9022.5–9948.9)ms, final candidate pair10.5%slower. Candidate discarded; no retained runtime/native/API change. Report and reproducible evidence only. Base synchronized to0330d6eb1; measured package source remains2363c8236.

Raw helpers, complete profiles/logs and frozen fixture preserved outside tree: /tmp/one-start-build-memory-debug-30ccdbb2f.tar (162MiB). Tracked evidence/report in docs/benchmarks/build-memory.md. DraftPR https://github.com/onejs/one/pull/887, exact pushed head30ccdbb2f22847575d7d49a66eab7cd4444d2e9a. Required applicable workflow Checks and Tests38657079818; native workflow not triggered by docs-only diff. No remaining implementation; own terminal CI follow-up before cleanup.

2026-10-14 Nate on shared result: "It is OK we do not beat them on every single one" (paraphrase of dictated contraction). He accepts production-build threading memory as a speed tradeoff; development memory remains concerning. Explained production-build versus serving/dev distinction, checked parent recorded dev817.6vs571.2MiB and serving119.7vs86.9MiB; sent exact quoted direction to parent for its owned Contrast spec. No new optimization scope; CI watcher w-2e2c19 remains armed.

RAN terminalCI38657079818 SUCCESS on30ccdbb2f22847575d7d49a66eab7cd4444d2e9a, checks and tests both success. No runtime change kept; bounded negative complete. No owned windows, active waits or listeners4421/4422/4423. External archive /tmp/one-start-build-memory-debug-30ccdbb2f.tar and final handoff /tmp/one-start-build-memory-handoff.md preserve result. Managed worktree removal requested from primary checkout; outcome recorded next.

Cleanup RAN: tm worktree remove returned kept, held only by m33927 own PIDs56587/56631/56633/56634/57075. Clean published tree auto-releases on this session exit; never forced. Final handoff records reason/live owner. Bounded result complete; future optimization requires separate lane choice.
