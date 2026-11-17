---
id: t-mvm2h8n6-17er0
title: Finish embedded bytecode in the Mac Release app
status: done
owner_status:
  state: landed
  text: TM main dbcdba7206; actual published-SDK Debug and embedded Release acceptance passed; CI103700 owns broader checks
  updated_at: 1792826826152
assignees:
- s69213
labels:
- lane:one-macos
parent_id: t-mvlxc4mp-1lmr0
backend: git
commits:
- f6d02d7cd849b05ed87d0b66ef2abfabe8fb6676
created_at: 1792826281986
updated_at: 1792826826152
field_marks:
  active_form: 1792826281986
  assigned:s69213: 1792826502546
  body: 1792826826152
  claim: 1792826502546
  claim_current:fe44d3f67ba00b142a60e4799311c72f: 1792826502546
  claim_state:fe44d3f67ba00b142a60e4799311c72f:1792826502546:~:~:~:f: 1792826502546
  commit_linked:f6d02d7cd849b05ed87d0b66ef2abfabe8fb6676: 1792826501304
  evidence_summary: 1792826281986
  owner_status: 1792826826152
  parent: 1792826281986
  priority: 1792826281986
  recovery_ref: 1792826281986
  status: 1792826826152
  title: 1792826281986
  unassigned:s73727: 1792826502546
---
Opus medium implementation unit under lead69213. Own only gui/macos/project.yml and react-native.config.cjs; adopt existing two-path edits in shared consumer tree. Goal: normal Release packaging and actual populated app from embedded HBC with no JS server/URL override. Detailed brief: /Volumes/Samsung-1TB-990/evidence/one-macos-content-first/registry-startup-5538/release-brief.md. Debug/runtime acceptance already passed; lead has stopped own Debug apps65026/28139 and dev server26723 after proof, so4389 should be free. Matching Release frameworks/stamps seeded in separate OneMacosCore-Release. No clean/reset or author/Debug cache mutations. CI103700 owns broader checks; lead owns source/capture review and landing. OnePR1027 feature/main/stable remain held.

Lead Codex review APPROVED f6d02d7cd. Independently verified executable/HBC99 hashes and unchanged retained Debug archive; inspected encoded real Release captures. Source uses shipped phase/CLI config with isolated per-config output. Runtime embedded-file/no-JS-server/navigation proof accepted from author; no independent repeat, timing or broader platform claim. Source submitted through normal tm land together with containing pin bca6b721e; CI103700 owns broader delivery. Author app stopped and source/cache retained for live lead69213.

RAN normal tm land submitted only bca6b721e + f6d02d7cd, preserved original authors, checks passed and main push receipt confirmed40b2e0accf98ba8f01a49adb42c9e8b3a56e3e1b + dbcdba7206d7e1d6bcc74c37058d676f4abc6d38. Integrated four Mac-owned files are byte-equal to validated branch source. land-receipt.json retained. CI103700 owns normal broader checks/failure routing. Actual Release HBC99 embedded launch, native file mapping and background navigation pass; no JS server, timing or platform-wide claim. One feature PR1027 and stable publication remain held. All owned acceptance apps/servers stopped. Shared clean source/installed deps, Debug/Release DD and evidence retained for live lead69213 pending owner feature review; no removal/reset. Release screenshots shared from lead session.
