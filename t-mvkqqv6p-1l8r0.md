---
id: t-mvkqqv6p-1l8r0
title: Preserve explicit effort during capacity healing
status: done
active_form: resolver fixture and all 23 respawn tests passed; admitted focused clippy running; historical full argv and exact healing lineage recovered; preparing own-only main landing
owner_status:
  state: landed
  text: main 3f833eb012 pushed and verified; focused resolver fixture, all 23 respawn tests and clippy passed; p105063 owns actual-main p105593 review, p103700 automatic CI/runtime follow-up
  updated_at: 1792752499870
assignees:
- p106077
labels:
- lane:effort-preservation
- tm-defect
- umbrella:rsi
backend: git
sessions:
- p106077
commits:
- 3f833eb012010f1ec65c9f4bff4f3925774afc8f
created_at: 1792746109537
updated_at: 1792752690458
field_marks:
  active_form: 1792752334918
  assigned:p106077: 1792752092203
  body: 1792752539564
  claim: 1792752690458
  claim_current:f6f4a7cf6088cd2690d14f1284f29b4b: 1792752690458
  claim_state:3311ea569c79961c15f5ae842514aa9e:1792752051286:=p106077:=mc-h39p4gbj818h:1792752051286:f: 1792752051286
  claim_state:f6f4a7cf6088cd2690d14f1284f29b4b:1792752690458:~:~:~:o:3311ea569c79961c15f5ae842514aa9e: 1792752690458
  commit_linked:3f833eb012010f1ec65c9f4bff4f3925774afc8f: 1792752498476
  evidence_summary: 1792746109537
  label_added:lane:effort-preservation: 1792752242275
  label_added:umbrella:rsi: 1792752242275
  owner_status: 1792752499870
  parent: 1792746109537
  priority: 1792746109537
  recovery_ref: 1792746109537
  status: 1792752499870
  title: 1792746109537
---
RAN one-macos-idle-callbacks s69517 was launched by lead with lg -e medium. Capacity healing replaced it as s69529 on the same Sol model with effort high and a prompt saying effort superseded. A provider capacity refusal is not a reasoning failure. Preserve explicitly supplied effort unless owner or coordinator has independently authorized a change. Source lane lead s69213; repair separate from native Mac task.

RAN: independently recovered full parent native tool argv (explicit --group lg -e medium), both harness argv/runner options, owning studio-64 lane-healing ledger heal:s69517:1792745917119 and lineage s69529 -> s69517, and matching parent automatic-heal message. Historical deployed e9e179eaa38f and current respawn code discard options on group reselection. INFERRED cause: runner default replaces captured medium; resolver fixture running without backend. Evidence /Users/n8/.team-machine/evidence/rsi-effort-preservation. Changes limited to src/commands/respawn.rs and docs/lane-healing.md; foreign src/git_operations.rs untouched.

TESTED: admitted Rust resolver fixture passed all 8 request variants (group/agent, captured medium/absent, replacement low/absent) against runner default high. Actual launch-plan selection/compilation invoked under disposable TM_HOME, no backend execution. Captured medium survives, missing effort defaults high, caller low wins, old model/account/env pins absent. Existing inherited/explicit tier tests being run unchanged. Historical deployed e9e179eaa38f source independently confirms discarded options.

TESTED: source 2ce49d70ef426631286d3d4e58e96d9f563962f8 landed alone via tm land --commit as main 3f833eb012010f1ec65c9f4bff4f3925774afc8f, pushed receipt and fresh origin/main ancestry verified. All 23 respawn tests, 8-case actual resolver fixture, admitted clippy --lib --bin tm, rustfmt and diff checks passed. Tier normalization/admission tests unchanged and passing; prior account exclusion retained. No backend/provider/original replay/native build/manual runtime action. Parent p105063 retains held shared tree and actual-main standing review p105593; CI p103700 owns broader checks and automatic deployment. Foreign src/git_operations.rs remains untouched/uncommitted. Evidence and handoff outside tree at /Users/n8/.team-machine/evidence/rsi-effort-preservation.

Production followup t-mvkuk1vw-1szl0 assigned to CI p103700 in original One task lane; parent p105063 owns standing actual-main review p105593. Compact handoff /Users/n8/.team-machine/evidence/rsi-effort-preservation/handoff-p106077.md. No owned services or waits remain; held shared tree retained for parent.
