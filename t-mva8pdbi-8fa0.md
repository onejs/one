---
id: t-mva8pdbi-8fa0
title: Compare One development memory and loading on Studio
status: done
assignees:
- s44967
labels:
- branch:tm/one-start-round3-sol
- lane:one-start-round3-sol
- umbrella:plans/contrast/tanstack-site-comparison.md
backend: git
commits:
- 3e33ef306
created_at: 1792111144878
updated_at: 1792114102089
field_marks:
  active_form: 1792111144878
  body: 1792114102089
  claim: 1792111144878
  commit_linked:3e33ef306: 1792113878495
  evidence_summary: 1792111144878
  owner_status: 1792111144878
  parent: 1792111144878
  priority: 1792111144878
  recovery_ref: 1792111144878
  status: 1792114102089
  title: 1792111144878
---
Owner s44967; CI owner ci-manager. Source-only PR https://github.com/onejs/one/pull/926, head 3e33ef306, independently approved by large reviewer s45102. RAN: baseline real optimizer regression failed; four final integration cases pass, package build and tsc pass, lint/diff checks pass. Review found a dead new plugin-props option and mock-only tests; the option now lives only on internal scanner inputs and exclusions use real optimizer tests. Generated declaration fixes first CI freshness failure; executable artifacts remain byte-identical to measured candidate. TESTED: three quiet alternating Studio control/candidate pairs, each with Start baseline, six SSR/hydrated routes and three HMR kinds retaining document/theme and zero reloads. RAN median paired savings: ready210.2MiB, after-six-pages-plus-GC230.7MiB, all pairs lower before updates; post-HMR mixed (median paired candidate18.4MiB higher). One still above Start. Both production builds and native-module audits pass; three production browser pairs pass routes and same-document navigation (One166.8ms, Start346.5ms medians; no causal attribution to this change). Single mobile Lighthouse13.5/Chrome155 pair perf93/90 and LCP3240/3003ms, no winner or improvement claim. INFERRED from saved audits: shared video poster is largest element; no framework LCP defect established. Invalid early source-leaking diagnostics excluded. Raw evidence and review are on tm/one-start-round3-sol under docs/benchmarks/website-round3. PR auto-merge is enabled; ci-manager owns Checks and Tests and Android Native Build delivery. Contrast results queued via own-only ref tm/one-start-round3-results, ticket000000000001792113794457-44b8b00-2175a9. No deployment or public site change.

RAN cleanup: source/evidence heads verified on origin; 169 evidence manifest hashes and tracked paths verified. Removed owned temporary dependency installs, cache and generated builds; stopped owned staleness watcher89214; no owned listener on4421/4422/4431/4432/9221/9222 and no resource grant/pending request. Reviewer delivered and finished. tm worktree remove from primary kept /Volumes/Studio-Ext/worktrees/one-start-round3-sol only for this session harness and says it releases on session exit; live owner s44967 until finish grace. Archive and cleanup receipt: /private/tmp/one-start-round3-s44967, cleanup.json. Final Contrast handoff/results queued via tm/one-start-round3-final-results at09a383fbf9388bf40e40e7c9dc43f5d2dbbcf835, ticket000000000001792113988903-09a383f-18fded. No CI/landing watcher; ci-manager owns delivery.
