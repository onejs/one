---
id: t-mvkrr74v-200k0
title: Bridge native Mac menu commands to the shared application
status: done
labels:
- lane:one-macos
- umbrella:one-macos-native
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69591
commits:
- 5c84f600e885394fd2eae51e1ea3667e95576836
created_at: 1792747804639
updated_at: 1792753990566
field_marks:
  active_form: 1792747804639
  body: 1792753990566
  claim: 1792753833461
  claim_current:8c7c09fae13efef11e31ea085bb6eab6: 1792753833461
  claim_state:66d44d0a0fdca440c1e78dbb6f9138bd:1792747835027:=s69591:=mc-3aa87nk0z4j17:1792747835027:f: 1792747835027
  claim_state:8c7c09fae13efef11e31ea085bb6eab6:1792753833461:~:~:~:o:66d44d0a0fdca440c1e78dbb6f9138bd: 1792753833461
  commit_linked:5c84f600e885394fd2eae51e1ea3667e95576836: 1792753778172
  evidence_summary: 1792747804639
  owner_status: 1792747804639
  parent: 1792747804639
  priority: 1792747804639
  recovery_ref: 1792747804639
  status: 1792753792369
  title: 1792747804639
---
Consumer ask20 and owner native-Mac direction need working native menu/keyboard commands. Existing shared Team Machine appCommands defines command ids, bindings and menu configuration, but One Mac has no app-shell-to-JS command bridge. Build a minimal runtime-scoped typed One Mac API and AppKit shell hook to reuse that existing command configuration without app-specific ids or a second command registry in One. Preserve standard Edit/Window/Services behavior; no activation/cursor movement. Validate genuine native menu action to JS and listener/reload lifetime, push branch; lead owns consumer wiring and independent review; ci-manager owns normal workflows.

Concrete consumer tsc blocker added to current API author scope: OneMacOS still only Toggle and Mac entry declaration One:any. Correct native control props plus explicitly narrowed macOS entry and declarations, preserve generic other-platform optional namespace and runtime bytes. Consumer target moduleSuffixes should match actual .macos/.desktop/plain resolution. Separate speculative segmentDistribution omission disproved by SDK header and actual same-constructor AppKit probe: .fill default1 at400x26; no source change without actual remaining frame discrepancy.

Independent Sol review APPROVED5c84f600e8: inspected per-root config/weak targets, menu replacement/restoration/standard-menu preservation, generation guarded config/listening, per-start TurboModule cache, all4 Release private log sites and typed Mac declaration. Actual native source compiled with installed RN/controls archive; disposable parser probe passed valid nested Input context, invalid key/context/menu rejection without changing retained valid config, minus key and control-shift-tab parsing. Strong assertions active DEBUG1/noNDEBUG. Evidence /Users/n8/.team-machine/evidence/one-macos-resume-s69213/menu-review.{mm,log} + compile-menu-review.py. Author real inactive AX/key/two-root captures and provenance inspected. Limits: active app key/main routing not exercised; first inactive AX reorder updates menu contents on next event, explicitly documented. Clean merge-tree dry run with current producer3779 succeeds, no worktree/ref changed. Lead owns assembly and actual TM menu acceptance; CI ci-manager.
