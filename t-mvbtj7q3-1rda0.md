---
id: t-mvbtj7q3-1rda0
title: Reduce One production build work at two prerender workers
status: done
owner_status:
  state: landed
  text: investigation complete; neither candidate meets memory/no-slowdown bar; no PR
  updated_at: 1792209006288
labels:
- branch:tm/one-build-climb-sol
- lane:one-build-climb-sol
- umbrella:plans/contrast/one-build-performance.md
backend: git
created_at: 1792206595803
updated_at: 1792209006288
field_marks:
  active_form: 1792206595803
  body: 1792209006288
  claim: 1792206595803
  evidence_summary: 1792206595803
  owner_status: 1792209006288
  parent: 1792206595803
  priority: 1792206595803
  recovery_ref: 1792206595803
  status: 1792209006288
  title: 1792206595803
---
Assigned by oss-fixer p92180. Profile main and workers, compare source installed through bun release --into in private fixture against identical control and TanStack Start. At least three alternating control/candidate pairs, output identity across 195 HTML files and assets, no higher peak memory. Deliver pushed PR for p92180 review; no merge or release. CI owner: ci-manager.

RAN profile on pro-64: worker phase totals 9.57s pageLoader, 9.73s SSR render, 1.03s HTML writes. Only about 0.34s idle per worker between tasks. Worker buildPage imports Vite solely for normalizePath, loading Rolldown/fsevents into each worker. Source hashes match all 1191 remote fixture archive files except two generated bundle evidence reports. Parent correction: all final quiet timings run on pro-128; reference pro-128 comparison owns the quiet window first.

RAN candidate 1 local output identity: SHA-256 equal for every one of 1496 client files, including 195 HTML files, asset filenames, web/native loaders, and sitemap. Existing workerPool integration, oxlint, oxfmt pass. Remote quiet admission initially reports another active quiet window and an earlier request. No timing win claimed yet.

RAN fresh pro-128 quiet first series: published One 2.7.7 two-worker median 8.129s (8.080–8.406), Start 11.635s (10.621–12.644), three reversed rounds after warmup, 195 HTML each. Start RSS median 1.2496 GiB. Parent has changed remaining goal to memory reduction with no slowdown; may finish without PR if no candidate survives. Vite-free candidate not a demonstrated speedup; isolated memory pairs queued. Second candidate retains both native URLs but copies the written CJS artifact for its second filename, avoiding repeat JS-string encoding/write.

RAN three sampler on/off rounds with warmup on pro-128: One no-sampler median 10.546s (8.085–12.565), sampler 10.623s (10.518–13.027); Start no-sampler 14.332s (12.126–17.921), sampler 13.515s (12.679–15.448). No consistent sampler-caused slowdown is demonstrated. All four arms emit 195 HTML files. First isolated Vite memory comparison was refused by quiet admission without starting; requeued after sampler completed. Memory-copy candidate preserves all 1496 client file SHA-256 hashes. Native URL test intentionally fails when the uncached copy is omitted and passes after restoration.

Goal: reduce One production build peak memory with no slowdown at two workers, preserving output. Branch tm/one-build-climb-sol, no commits or PR: neither experiment earned shipping. No merge or release occurred.

RAN on pro-128, 1 warmup and 3 alternating measured rounds: One 2.7.7 median 8.129s (8.080-8.406), RSS 1.807 GiB; Start 1.169.2 median 11.635s (10.621-12.644), RSS 1.250 GiB (1.244-1.279). Both emit 195 HTML. One already wins build time.

RAN isolated native loader file-copy pairs: control median 8.746s (8.422-10.115), RSS 1.801 GiB (1.798-1.807); candidate 10.070s (9.089-11.177), 1.784 GiB (1.732-1.820). Slower all 3 pairs; RSS mixed signs.

RAN isolated worker Vite-import removal pairs: control 8.266s (8.229-8.487), RSS 1.791 GiB (1.780-1.811); candidate 7.999s (7.839-9.360), 1.841 GiB (1.760-1.908). Time/RSS mixed signs, median RSS rises.

TESTED all 1496 client files have identical SHA-256 in every one of the six paired comparisons, including 195 HTML, all asset names/content, both native loader URLs and web loader files. Native ordinary/redirect artifact integration passed, and intentionally omitting the uncached native artifact failed. Lint/format passed.

INFERRED neither candidate provides repeatable memory savings without slowdown. Positive paired RSS increases and file-copy slowdown reject the claims. Parent independently confirms build time already won; no additional action needed in this lane. Memory gap remains unresolved.

Evidence and both source patches: pro-64 /private/tmp/one-build-climb/evidence/report.md; raw isolated runs under evidence/remote/memory-copy and memory-vite-second. Reproducible package archives under transfer. Private pro-128 fixture /private/tmp/one-build-climb retained for reviewer p92180, together with raw results/archives; original one-tanstack-latest unchanged. Local fixture app copies removed; evidence and archives retained for p92180. HTTP server stopped. Managed worktree removal recorded below. CI owner ci-manager: no push/PR, no CI pending. Release owner s47560: no release. No children or open blockers.
