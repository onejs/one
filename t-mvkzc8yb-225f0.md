---
id: t-mvkzc8yb-225f0
title: Preserve native Mac text color through opacity and appearance changes
status: done
labels:
- one-macos
- upstream
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- session   s70167
created_at: 1792760544083
updated_at: 1792761726130
field_marks:
  active_form: 1792760544083
  body: 1792761726130
  claim: 1792760544083
  evidence_summary: 1792760544083
  owner_status: 1792760544083
  parent: 1792760544083
  priority: 1792760544083
  recovery_ref: 1792760544083
  status: 1792761726130
  title: 1792760544083
---
Actual consumer draft AXValue is nonempty in light appearance but paints blank after dark. TESTED actual OneMacosTextStorage probe in current archive freezes NSColor textColor via colorWithAlphaComponent even at opacity1; source repair preserves semantic identity or resolves opacity in a dynamic provider. Lead s69213 owns build/consumer adoption; independent Opus review requested; evidence input-appearance under lead evidence. CI ci-manager. No main merge or stable publication, contained in One minor PR1027.

TESTED ea447e78bdfb07c4711c1d309a90f9c2394e9345 committed/pushed to tm/macos-resume. Actual TextStorage probe red four cross-appearance cases before, green8/8 after, core incremental build98s. Complete local One family installed into consumer without rebuilding JS, native source hash verified. Independent Opus s70167 review in progress; consumer final rebuild/visible draft proof assigned successor. CI ci-manager requested containing canary; feature/stable hold remains.

Independent different-model review by Opus s70167 APPROVE, no blocking defects. Actual production archive extended probe64/64 PASS: textColor/labelColor; NaN/1/.6/0 opacity; Aqua/Dark construction; Aqua/Dark plus high-contrast appearance resolution; NSColor and CGColor. Memory/capture lifetime source reviewed. Evidence input-appearance/opus-review.md and opus/probe.log. Actual consumer visible draft acceptance pending s70180.

RAN single containing branch-canary dispatch accepted https://github.com/onejs/one/actions/runs/39959092975 workflow_dispatch created2026-10-23T13:10:58Z, exact source ea447e78bdfb07c4711c1d309a90f9c2394e9345. CI owner ci-manager receives exact run/head and owns terminal/artifact verification. No new feature/stable approval; actual consumer s70180 acceptance remains independent.

TESTED final actual TeamMachineOne native consumer s70180 passes: same own draft visible through dark->light->dark->light and multiline light/dark; AXValue matches, session switch restores exactly, native All/Flags and menu toggle work. One native source ea447e78bd file hash0bac7777...330b33e5, consumer incremental target112s compiled actual changed object and linked it (dynamic provider symbol verified). Provenance/captures /Volumes/Samsung-1TB-990/evidence/one-macos-live-flow/s70180. Core source pushed, independent Opus64/64 approved. CI owns containingcanary39959092975 in separate artifact task; producer unit done, One feature/stable still held.
