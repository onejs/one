---
id: t-mvbu9a50-1lnv0
title: Reduce One homepage blocking time and development overhead
status: done
owner_status:
  state: needs
  text: p92180 review draft PR946 with TBT regression; decide whether to discard or pursue; requested targets unmet
  updated_at: 1792210229581
assignees:
- p92180
labels:
- branch:tm/one-runtime-climb-sol
- lane:one-runtime-climb-sol
- umbrella:plans/contrast/one-runtime-performance.md
- umbrella:plans/contrast/tanstack-site-comparison.md
backend: git
commits:
- 6f92ab9a457c9ccadd1108a57cac1aad3adb49c2
created_at: 1792207811988
updated_at: 1792210346302
field_marks:
  active_form: 1792207811988
  assigned:p92180: 1792210229581
  body: 1792210346302
  claim: 1792210229581
  commit_linked:6f92ab9a457c9ccadd1108a57cac1aad3adb49c2: 1792210176081
  evidence_summary: 1792207811988
  owner_status: 1792210229581
  parent: 1792207811988
  priority: 1792207811988
  recovery_ref: 1792207811988
  status: 1792210346302
  title: 1792207811988
---
Assigned by oss-fixer p92180: profile and reduce homepage mobile Lighthouse blocking time, development process-tree RSS, and / to /docs/introduction client navigation on pro-128 fixture. Preserve behavior and visuals; exclude build/prerender pipeline. At least three alternating timing pairs and five Lighthouse runs per arm. Push one PR; p92180 reviews, ci-manager owns CI; no merge or release.

RAN inspector profile on pro-128 isolated fixture: navigation 421.9ms; loader resource 29.2ms then destination graph imports in series. Collected server heapUsed 311.9MB and RSS 1.915GB under inspector, not a comparable timing baseline. Heap retains optimized SSR one module ~10MB transformed source, ReactDOM browser client ~8MB transformed source and generated map data. Fresh production profile saved separately. INFERRED navigation suspense contributes delay; candidate parallelizes existing module preloader with loader. Would be wrong if paired same-source navigation remains unchanged.

Build admission: local studio-64 refused for lack of cores; air-32 managed tree installed dependencies, then heavy refused because a governor-paused job awaits recovery. pro-128 previously refused shell worktree launch during its active quiet window. Retained managed remote tree /Users/n8/.worktrees/one-runtime-climb-build owned by child shell m39050 for source package compilation. No performance gain claimed yet.

RAN browser CPU trace: longest production homepage tasks 137ms layout, 108ms hydration, 97ms module evaluation. Largest named user-code self time was Tamagui addThemesFromCSS (27ms at 4x CPU slowdown). Native-safe-area measurement is duplicated at the document root and body, but no cause/gain claimed for it without a paired probe. The current candidate touches development preload only; it cannot improve production TBT.

INFERRED from saved production CPU profile and emitted layout: site config eagerly transforms v5ThemesCamel even though themes passed to createTamagui is {} in the client. Candidate moves the existing VITE_ENVIRONMENT client condition around Object.fromEntries and retains the same themes value. This is a site configuration performance fix, not a new Tamagui core change. Will isolate Lighthouse and byte differences against unchanged config; no gain claimed yet.

RAN control vxrn-root import probe on air-32 under heavy admission: collected heapUsed 23.5MB, RSS 148.4MB, 274 require.cache modules. hermes-parser and sucrase load transitively through react-native-css-interop. This bounds the native-command barrel hypothesis; no change retained for it. Navigation quiet window is queued behind another quiet measurement.

TESTED candidate native Flow/Babel behavior: 32 tests passed. Additional memory candidate moves CSS converter import into native CSS transform and Hermes parser import into Flow-enum branch; no behavior/default/API change intended. Native CSS output probe and same-source serving pairs pending. No memory gain claimed.

RAN completed pro-128 quiet navigation probe, three alternating pairs after a warmup: control 308/324/304ms, candidate 307/300/313ms (rounded). Median control 308ms, candidate 307ms; ranges overlap. TESTED all six page routes and component/footer/CSS HMR preserve document and theme. REJECTED the navigation preload change because it has no repeatable gain. Source/test patch preserved outside the checkout; candidate package tar and full raw samples retained remote. No navigation change remains in source.

RAN five alternating Lighthouse source-control/theme-only pairs under pro-128 quiet admission: control TBT [0,0,0,0,0]ms; theme guard [5,4,28,5,8]ms (median 5). Median LCP 3230.94 vs 3082.88ms. Raw client JS excluding per-route loader/native loader outputs: 1,734,010 vs 1,650,254 bytes; root layout 120,683 vs 36,927 bytes. No TBT reduction claimed; source-control floor is already zero. This isolates site config only, with baseline source One 2.8.0 at c0dba3c7b. Published 2.7.7 reference remains separate. Page parity validation pending.

RAN emitted root-layout removal: 83,756 raw bytes. TBT control floor is 0ms, so the requested percentage reduction cannot be demonstrated in this source arm. LCP improves ~148ms (4.6%). First root-import memory probe on Studio candidate: collected heap 21.3MB and RSS 141.1MB, compared with a different-host control 23.5MB/148.4MB; no cross-host gain claim. Native CSS probe initially failed because its VM stub used __require while the built code uses require; correcting the probe to the actual emitted calling convention, without changing runtime code.

Owner direction spec written and queued through the Contrast main merge train at 12e92d5d0625542cad2ca1c18db0bd3a0dc0044c. It records quoted scope and separates the production-serving row owned by p92180 from this dev-memory/navigation lane. No landing watcher; ci-manager owns the train. Temporary index based on fetched origin/main preserved the primary checkout and its unrelated dirty files.

RAN: compiler lazy-native-import serving RSS three pairs, control [1013.922,1017.109,920.625] MiB vs candidate [1094.281,1000.531,980.984], medians 1013.922 vs 1000.531 (-1.3%, within spread); nav medians 324.024 vs 380.872 ms. Rejected compiler changes. TESTED: theme-only six production routes equal normalized HTML/body text/links; no browser errors, WebP captures saved. RAN: published2.7.7 TBT [105.625,14,37,4,40] median37 vs source2.8.0 [59.5,26.5,19,63.5,1.5] median26.5; original theme experiment control median0 varies substantially. Additional five alternating same-source theme pairs underway to resolve that uncertainty.

RAN: second five-pair Lighthouse set TBT median control4 vs candidate42ms; combined10 pairs control0 vs candidate25.5ms. LCP combined medians3231.47 vs3085.48ms. TESTED: mobile WebP captures byte-identical SHA256 d4d59e0dd2733576547baad192aa8ac5885ccc4f4248e48f223e453f2f875f80. Site config is committed at6f92ab9a4 for a DRAFT PR; no TBT/memory/navigation target claimed, reviewer must decide tradeoff. Compiler/navigation experiments fully removed; remote shell stopped and air managed tree removed. Owner direction corrected in existing plans/contrast/tanstack-site-comparison.md, staged plan hygiene passed, resubmitted source15d6085b5006f3045911f9d3da555c2b1b537d5d to Contrast main train (supersedes refused12e92d5). ci-manager owns CI/train follow-up.

Delivery: draft One PR #946 https://github.com/onejs/one/pull/946, branch tm/one-runtime-climb-sol at6f92ab9a457c9ccadd1108a57cac1aad3adb49c2. All requested performance goals remain unachieved; only site byte/LCP gain is retained with measured TBT regression. Review/tradeoff owner p92180; CI owner ci-manager. No merge/release. Raw evidence and fixture copies retained pro-128:/private/tmp/one-runtime-climb, live review owner p92180; no servers remain on ports4521/4522 (lsof returned no listeners). Air build child stopped, managed tree removed; rejected patches/probes preserved in evidence.

p92180: reviewed. Draft PR 946 closed (TBT rose 0 -> 25.5 ms in pairs; site-only config). CSS theme hydration lead handed to p92588 (tamagui-theme-hydration-sol). Evidence pro-128:/private/tmp/one-runtime-climb retained by p92180.
