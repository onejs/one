---
id: t-mvbyn007-1pdu0
title: Measure and ship One runtime speedups without blocking-time regression
status: done
owner_status:
  state: needs
  text: investigation closed with no shipped win; parent s47560 owns remaining performance targets
  updated_at: 1792218351472
assignees:
- s49235
labels:
- branch:tm/one-runtime-climb-2
- lane:one-runtime-climb-2
- umbrella:one-runtime-performance
backend: git
created_at: 1792215170503
updated_at: 1792218388407
field_marks:
  active_form: 1792215170503
  body: 1792218388407
  claim: 1792215170503
  evidence_summary: 1792215170503
  owner_status: 1792218351472
  parent: 1792215170503
  priority: 1792215170503
  recovery_ref: 1792215170503
  status: 1792218351472
  title: 1792215170503
---
Successor assignment from s47560: resolve draft PR 946 TBT regression; profile CSS theme hydration, dev RSS and navigation; alternating quiet A/B measurements. One PR requires assigned Opus review through parent; no releases. CI owner: ci-manager.

RAN inherited predecessor task: PR946 already closed; theme hydration transferred to p92588. Parent notified once about lane overlap; One dev RSS/navigation profiling proceeds without touching Tamagui core.

RAN saved dev heap has duplicated large transformed One and ReactDOM client strings. Candidate moves ReactDOM client require behind a compile-time SSR guard in render, retaining synchronous browser rendering. Cache eviction lead dropped because resolving route cancels its timeout, so the proposed premise did not hold. Quiet same-source renderer memory/navigation A/B probe prepared on pro-128 under /private/tmp/one-runtime-climb-2; original evidence untouched.

Candidate preserved and pushed at 9ffac3de8 on tm/one-runtime-climb-2. TESTED three focused bundled renderer tests cover SSR no client evaluation, browser hydrate/SPA/update/listeners; formatting and lint pass. RAN quiet job w-be4737 exited75 without starting, narrow behavior launch refused0.5 cores; no measurements, no PR, no merge, no release. Next: get admitted on pro-128, run isolated fixture renderer-memory.mjs, confirm actual app behavior and compare pairs; reject if not a repeatable gain. CI owner ci-manager once a PR exists.

RAN quiet pro-128 first3 pairs, excluding warmup: control nav[210.4,231.4,219.6]ms, candidate[212,215.6,209.1]ms; collected process-tree RSS[692.75,713.81,676.36] vs[688.81,617.28,632.34]MiB. Candidate heap first246.21 then205.39/205.38MiB; control244.83/243.66/243.57MiB. Six routes render with no page errors and client navigation preserves the document. INFERRED candidate first measured pair still had optimizer generation turnover; confirmation requires stable warmed dependency graphs, not treating the first sample as a win.

REJECTED renderer experiment: five quiet confirmation pairs median collected RSS control628.078 vs candidate635.531MiB; navigation209.70 vs209.10ms; max RSS868.328 vs874.875MiB. No useful gain. Control heap settled205.6MiB like candidate after optimizer turnover; source candidate removed and pushed. RAN original source fails new SSR non-evaluation regression as expected; changed source passes3 tests and package JS build, but correctness improvement alone is outside measured-win acceptance. Next bounded lead: SSR optimizer whitespace compaction with identifier names, syntax, legal comments and source maps retained; only isolated app config changed for the probe.

RAN whitespace-only SSR compaction,3 quiet pairs: RSS control[638.22,635.92,639.42] vs compact[692.78,713.61,680.81]MiB, navigation[213.4,208.7,202] vs[213,214.4,230.6]ms. Rejected; no repo change. Next causal lead: early SSR dep optimizer exposure (holdUntilCrawlEnd:false inherited from client config) may create the duplicated versioned/unversioned dependency graphs retained in saved heap. INFERRED from saved duplicated transformed modules and optimizer cache turnover; would be wrong if server-only crawl hold does not prevent duplicate module evaluation or improve matched measurements.

Additional navigation lead from source: preloadRouteModules strips /_layout suffix only with a leading slash. A route-group root layout normalizes to _layout.tsx and fails matching, so prior dev preloader experiment may still suspend on the destination ancestor. Bounded causal probe will preload/register only the actual docs ancestors and page before click, include preload time in total, compare same server/cache, and preserve document identity. No runtime edit yet.

RAN targeted ancestor preload3 quiet pairs, includes import/register time: control[214,214.6,219.5]ms vs parents[215.2,223.9,241.9]ms. No gain at locator-based timestamp. INFERRED measurement may contain a Playwright locator polling floor because most browser-start samples cluster near210ms across unrelated candidates. One final probe adds an in-page MutationObserver plus two animation frames to timestamp the actual destination heading, while retaining locator time for direct comparison; measurement premise changed, no runtime edit.

RAN observer+two-frame navigation timestamps,3 quiet pairs: control[183.6,184.5,189.5]ms, targeted parents[177.1,178.2,186.3]ms. Locator clocks[212.7,207.2,210.1] vs[226.6,226.2,229]ms include sampling delay and do not timestamp the actual paint. Small paired gain3.2-6.5ms remains insufficient to justify broad preloading behavior/complexity; no source change. Final announced memory lead: SSR-only holdUntilCrawlEnd:true using the unchanged renderer, to test early optimized-generation exposure.

Goal: One homepage TBT, dev RSS and dev navigation improvements. This pass exhausted the inherited and bounded new leads without a shippable measured win. Targets remain unmet; no PR, merge or release.

Branch tm/one-runtime-climb-2, pushed ec3b9877b (rejects WIP 9ffac3de8). Net tree diff from starting c0dba3c7b is empty. Do not land these empty-net experiment commits. Main moved separately to9ed69cb09 during this pass.

RAN PR946 is already CLOSED by p92180 for TBT regression. CSS theme lane p92588 already finished negative; no duplicate theme work performed.

RAN all timing runs alternating quiet pro-128 pairs. Renderer SSR guard first3 pairs looked lower in RSS; confirmation5 pairs disproved it: collected process-tree RSS median628.078 vs635.531MiB (ranges624.125-628.344 vs624.609-681.641); nav209.70 vs209.10ms. Candidate/old source test and One JS target build passed; original SSR non-evaluation test failed as expected, but no useful measured gain. Removed candidate.

RAN whitespace-only SSR compaction3 pairs: medianRSS638.219 vs692.781MiB, nav208.70 vs214.40ms; rejected without repo edits. SSR holdUntilCrawlEnd3 pairs: medianRSS626.953 vs691.0MiB, nav220.50 vs216.90ms; no repeatable useful memory win, rejected without repo edits. Caveat: these config arms started with fresh dependency caches and retained generation turnover after the excluded warmup; no causal claim of permanent regressions from these values.

RAN targeted docs parent/page preload3 pairs: locator timestamp median214.60 vs223.90ms. Added browser MutationObserver plus2 animation frames because locator sampling lag obscured paint: median painted-heading184.50 vs178.20ms; paired gains3.2-6.5ms, ranges183.6-189.5 vs177.1-186.3. Preload/import time included; rejected small gain for broader routing complexity. This is not comparable to predecessor308ms external Playwright-clock baseline. Six real page routes, document identity and no page errors were checked in every run.

Evidence pro-128:/private/tmp/one-runtime-climb-2: all six raw JSON batches, summary.json (medians/ranges/samples), scripts/logs and evidence/rejected inputs. Original /private/tmp/one-runtime-climb untouched. Evidence retained for parent s47560; no services. Four owned cloned fixtures removed; port4531 positively TCP-refused. Local rejected source test in /tmp/one-render-rejected.test.ts. Task t-mvbyn007-1pdu0 final results.

Next: parent may assign a fresh main-thread profile or another cause; do not retry these unchanged candidates or relabel cache turnover as a win. No review/CI delivery pending; ci-manager remains general CI owner.

RAN cleanup: four owned remote cloned fixtures removed; scripts/raw data/rejected inputs preserved pro-128:/private/tmp/one-runtime-climb-2 for parent s47560. Port4531 positively refused TCP. Managed local tree clean/pushed, removal kept only for this session own processes and releases on exit. No services/watchers or pending CI delivery. summary.json is authoritative for all medians/ranges, including renderer-confirm maxRSS control median867.281MiB (earlier task note868.328 was a sample, not the median).
