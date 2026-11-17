---
id: t-mvlxvh9v-8380
title: Review Mac Debug Hermes bytecode delivery
status: done
owner_status:
  state: landed
  text: reviewed source pushed to held Mac branch; actual consumer proof remains in production follow-up
  updated_at: 1792818679752
assignees:
- s69213
labels:
- lane:one-macos
- umbrella:native-macos
parent_id: t-mvlx2lt8-ujo0
backend: git
created_at: 1792818548275
updated_at: 1792818679752
field_marks:
  active_form: 1792818548275
  body: 1792818679752
  claim: 1792818548275
  evidence_summary: 1792818548275
  owner_status: 1792818679752
  parent: 1792818548275
  priority: 1792818548275
  recovery_ref: 1792818548275
  status: 1792818679752
  title: 1792818548275
---
Offered author s72425 commit1ef63021b8 on tm/one-macos-startup, after753c accepted Release plus doc9c6fd7435b. Lead starts code/host/compiler review; Opus medium reviewer s73378 checks shared dev-server per-platform caching and updatesPublish helper extraction. One actual npm compiler/cache probe under normal heavy admission; preserve existing Debug consumer and caches. Author reports native Debug fixture HBC8.4MB, first compile0.74s/cache3ms, live Fast Refresh, existing8tests/typecheck; not independently rerun yet. Current integrated source753c unchanged until review. CI p103700 owns pushed workflows; no new publisher, OnePR1027 main/stable owner-held.

TESTED lead disposable Mac compiler probe on exact1ef630 helper passes actual RN-owned npm Hermes HBC99/magic, identical in-flight Promise/cached Buffer, new bundle and sourceURL invalidation. Actual npm/native cached hermesc both260318099.0.4/HBC99, RN pin and native Debug stamp agree. READ explicit-length host NSData -> JSBigStdString binary transport. No app/native build or consumer mutation. Evidence debug-bytecode-review/{lead-review.md,macos-probe.ts,macos-probe.log,compiler.ts}. Additional9c6fd7435b parent is profile docs only. Independent Opus73378 shared cross-platform review pending; branch753c unchanged.

Integrated by fast-forward preserving author1ef63021b8 and9c6fd profile docs. Origin/tm/macos-resume pushed1ef63021b8e3c02c286ef94115145f7440f2fcfa, clean tree. TESTED original bytecode8/8 on integrated branch, actual npm/nativeHermes release/HBC99 parity, Mac in-flight/cache/new bundle/sourceURL behavior, diff check. Opus73378 approves public shared boundaries, lead Codex bounded host/compiler review accepts. No dependency addition or fallback. Author actual fixture render/Fast Refresh remains explicitly author-only proof, total Debug startup not measured. followup:production t-mvlxc4mp-1lmr0 owns eventual containing registry SDK and actual Team Machine Debug/Release acceptance. CI103700 owns normal pushed workflows, no second watcher/canary dispatched. Current installed app/caches retained unchanged for live lead. Detailed evidence debug-bytecode-review/integration.md; featurePR1027/main and stable held.
