---
id: t-mv8mi61g-19bc0
title: Reduce One cold documentation SSR latency
status: done
owner_status:
  state: landed
  text: validated review branch b94b98d9c pushed; PR884 draft, both required CI passed; own tree releases on session exit; no main merge or release
  updated_at: 1792017831305
assignees:
- m33838
labels:
- branch:tm/one-start-competition-sol
- lane:one-start-competition
- umbrella:plans/contrast/tanstack-site-comparison.md
backend: git
commits:
- 76b5ad482
- b94b98d9c8571393f0330a9b5fb048aab1383991
created_at: 1792013391124
updated_at: 1792017831305
field_marks:
  active_form: 1792013391124
  body: 1792017831305
  claim: 1792013391124
  commit_linked:76b5ad482: 1792015051298
  commit_linked:b94b98d9c8571393f0330a9b5fb048aab1383991: 1792016964998
  evidence_summary: 1792013391124
  owner_status: 1792017831305
  parent: 1792013391124
  priority: 1792013391124
  recovery_ref: 1792013391124
  status: 1792017831305
  title: 1792013391124
---
2026-10-14 completed bounded cold-dev SSR fix. Owner/CI: m33838. No reviewer assigned. Review branch tm/one-start-competition-sol, draft https://github.com/onejs/one/pull/884. Source76b5ad482; final head b94b98d9c8571393f0330a9b5fb048aab1383991 pushed. No One/Tamagui main merge, release or deployment.

TESTED: remove vxrn build import's global Error.stackTraceLimit=Infinity mutation and preserve caller limit. Regression RED/GREEN and packed-root probe passed. Local release --into built/installed17packages; artifact audit isolates source difference to assignment and generated files.

RAN:3alternating source-only dev pairs configuration16492.8ms(range11977.1–17524.5)->714.0ms(573.8–764.8),95.7%lower; routing10620.5->722.9ms. Published2.7.2 n3 configuration10854.6->524.7ms. Cold means first URL after home/earlier routes, restarted servers, persistent optimizer/OS caches. Original published RSS+6.3%/footerHMR+8.5% did not repeat source-only(RSS816.2->810.2MiB;footer316.0->214.9ms). Warm routing+16.4%,blog+20.6%,fresh routingheap+5.8% remain disclosed.

RAN:production n3 published native/nav+43.2/+44.0% did not repeat original-source n3(native161.1->154.0ms;nav175.1->167.6ms). Other production medians/tails mixed, including source fresh routing/config+8.9/16.6% and warmintro/routing/blog+25.5/6.8/5.8%, overlapping ranges. No general production speedup or blanket no-regression claim. Static prerendered pages, not dynamicSSR. Complete report/samples pushed in docs/benchmarks/stack-trace-limit.md and adjacent JSON.

TESTED:dev+production6route output/meta/links/code parity, same-document nav/HMR, theme persistence,search,404,redirects,APIs; zero browser exceptions/native requests. Existing diagnostics preserved. All3builds client+SSR emittedRN/RNWbytes0. Native code/publicAPIs unchanged. Unchanged loader redirect file18/18passed locally after initialCIselector timeout.

RAN final requiredCI GREEN on b94b98d9c: Checks and Tests run38647879513 https://github.com/onejs/one/actions/runs/38647879513 ; Android Native Build run38647879548 https://github.com/onejs/one/actions/runs/38647879548 . Terminal follow-up complete; no required delivery checks pending.

Cleanup: no owned listeners4421/4422/4423/48768 or held/waiting resource windows. Managed worktree remove returned kept solely for own session processes; tm releases it when m33838 exits, do not force. Tree clean, all source/evidence pushed. Optional raw CPU/full logs/probes archived /tmp/one-start-competition-debug-b94b98d9c.tar. Handoff /tmp/one-start-competition-sol-handoff.md. Close-out shared from own session. Parent m33812 owns Contrast plan and unchanged comparison fixtures; design/acceptance summary is in handoff for plan reconciliation. Further memory/HMR targets are separate measured work.
