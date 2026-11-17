---
id: t-mvlx2lt8-ujo0
title: Integrate reviewed native Mac Release bytecode startup
status: done
owner_status:
  state: landed
  text: reviewed startup source integrated and pushed to held Mac feature branch; downstream Release acceptance tracked separately
  updated_at: 1792817667973
assignees:
- s69213
labels:
- lane:one-macos
- umbrella:native-macos
parent_id: t-mvlcdlx0-4px0
backend: git
created_at: 1792817201132
updated_at: 1792817667973
field_marks:
  active_form: 1792817201132
  body: 1792817667973
  claim: 1792817201132
  evidence_summary: 1792817201132
  owner_status: 1792817667973
  parent: 1792817201132
  priority: 1792817201132
  recovery_ref: 1792817201132
  status: 1792817667973
  title: 1792817201132
---
Owner startup direction recorded in Contrast specs/one-macos-native.md dated 2026-10-24, source author s72425. Offered bounded commits 4a808261f1 and 3e522f23e2 on tm/one-macos-startup based74aeaf50ae. Lead source remains clean74ae pending review. Author REPORTS TESTED Release MacosBasic standalone embedded bytecode main content185ms median vs served plainJS624ms; no Team Machine Release or lead independent timing claim. Lead READ RN file path maps lazily on JS evaluation but opens/fstats synchronously before loadScript schedules; reviewer s73308 Opus medium checks packaging and missing-file/lifecycle paths once, read-only. Preserve author; route defects to s72425, integrate approved bounded commits into held PR1027 only. Existing Team Machine Debug app28139/window27622 and both warm caches retained untouched. CI p103700 owns broader checks after push. One feature main merge and stable publication remain owner-held. No canary requested or dispatched for this unit.

Opus s73308 review complete: TESTED nonnull Swift URLForResource nil probe exits133 and uncaught ObjC++ runtime_error exits134. READ actualRN fromPath throws on open/fstat. Sent both concrete host failure defects to existing author s72425 with requested nonnil resource URL, handled file read failure, stale header and ignored entry flag corrections. Review /Users/n8/.team-machine/evidence/one-macos-resume-s69213/startup-review/review.md. No integration, build, dependency mutation, publication or retained-app changes. Previous review wait terminal; lead owns exact author reply wait. PR1027/stable holds unchanged.

RAN lead fast-forward preserved original author4a808261f1/3e522f23e2/753c573036 to origin/tm/macos-resume753c573036e7fd8acbb283f6f119be391cce882b; exact ls-remote verified, clean tree. Lead Codex bounded review accepts both concrete repairs from conditional Opus review. TESTED lead bash syntax, exact Debug early-skip invocation, diff check. Read author failure logs and inspected normal full fixture capture; author actual Release rebuilt normal/missing-path apps pass. No repeated timing, consumer overlay, native rebuild or canary. Evidence startup-review/integration.md and copied failure logs. Team Machine Release acceptance retained separately in followup:production t-mvlxc4mp-1lmr0, currently unwired and no performance claim. Existing app/caches retained for live lead. CI p103700 owns pushed workflow checks; feature PR1027 main/stable remain held.
