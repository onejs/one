---
id: t-mvng5aw8-b6c0
title: Build Linux app shell and routing
status: done
active_form: checking a stale measurement cache path found during final source review
owner_status:
  state: landed
  text: review repairs and M4 pushed with release VM proof; broader delivery checks with s72425 and ci-manager
  updated_at: 1792915703377
assignees:
- s79947
labels:
- lane:one-startup
- umbrella:one-linux
parent_id: t-mvnatphy-1rvk0
backend: git
created_at: 1792909705832
updated_at: 1792915703377
field_marks:
  active_form: 1792915159817
  body: 1792915703377
  claim: 1792909705832
  evidence_summary: 1792909705832
  owner_status: 1792915703377
  parent: 1792909705832
  priority: 1792909705832
  recovery_ref: 1792909705832
  status: 1792915703377
  title: 1792909705832
---
M4 assigned by s72425: share Mac navigation and command contracts, implement GTK stack/tabs, sidebar, header bar, menus/actions, multiple windows, and running arm64 screenshots. Fix forwarded review findings first. Branch tm/one-linux-native only, CI delivery with s72425 and ci-manager. No automated tests.

TESTED review2 #4: release VM Stepper label and in=[0,3], direct numeric setState callback, two increments stop at3. Commit de7edd40b7, capture plans/one-linux-native-stepper-contract.webp. RAN full One package and release host builds, Linux bundle/bytecode, lint0 errors. M4 paused and 39 own M4 files preserved under evidence/one-startup/s79947-m4-paused. TESTED #1 baseline named DropDown probe: real pointer selection Alpha to Beta left top-left RN presses/down/up at0. Does not reproduce in GTK4.14 Wayland; add explicit surface boundary after measurement work. INFERRED #2 main-thread premise needs correction: ConcreteState defaults Asynchronous and EventQueue flushes state on event beat; runtime commit-thread probe next.

TESTED measurement baseline: GDB sees9 UIManager state updates on thread8 one-javascript, and temporary surface snapshot probe sees first frame with9 controls/8 zero allocations, next frame9/0. This disproves the review main-thread premise but confirms per-control commits and layout shift. Repaired release host first control frame9/0. Build passed after97s external-volume I/O stall, previously sampled98% VM pressure. TESTED #5: plain parent rerender is memoized and keeps pending text; changing unrelated native testID with that rerender reproduces1 reverting to2. TESTED #6 baseline disable and revision mid-drag each show starts1/completes0. TESTED #3 width20/height20 causes control overflow; G_DEBUG=fatal-warnings stays running on GTK4.14. Repair validation and clean-source rebuild pending.

TESTED review2 repairs complete locally: de7edd40b7 Stepper API; a5d3f2e8d2 measurement batch and S6/#5 pending edits; cd88232de9 foreign surface guard (phantom press not reproduced); d6d04986cd minimum allocation and RN clipping (warnings not reproduced, overflow was); 7ab07b28c4 Slider cancellation pairs1/1 and2/2 after real continued uinput motion. Pointer fix now committed: desktop press/release inside baseline reproduces up1/down0; repaired ignores it and normal click gives1/1/1. Routed box-none hover did not reproduce; null-hit leave added. Captures linked in plan. Next assigned simplifications S1,S4,S3,S2,S5, then restore preserved M4. Source remains branch-only; full CI and delivery remain with s72425/ci-manager.

RAN source 2e96618dc9 (M4 35dfb216a6) pushed to tm/one-linux-native; no main push or PR. Review2 repairs de7edd40b7 through 6134f35b44, simplifications 9dadf4fd9a through 3e399cb0ce. TESTED release GTK arm64 fixture: controls, stack push/back with RN state, tabs including rejection and repeat events, sidebar, menus, key contexts, separate windows and close. Full One package/native declarations, release host, bundle/Hermes and lint passed. Screenshots and exact probe qualifications are in plans/one-linux-native.md. Final warm mounted frame 60.9 ms, RN text frame 101.9 ms; one observation, not a benchmark distribution. Delivery owner ci-manager through s72425: checks.yml and relevant native iOS/Android workflows, Mac native compilation/runtime and bundle byte comparisons remain; no release requested. Requested Mac wrapper/command sharing changes Mac JS and needs explicit classification at the byte gate. Gaps: advanced navigation presentation/header composition, Linux toolbar config, keyboard repeat and nested pop/scroll-to-top validation, GNOME Shell popup behavior (Sway warns on repositioning). No automated tests. Cleanup and handoff follow.

RAN final source 2a2a4cec85208bbe4188ae3f0d1ecdab05bb58b3 pushed to tm/one-linux-native and verified with ls-remote; worktree clean. TESTED an additional stale measurement race: a temporary native event changes testID between GTK measurement and Fabric submission. Baseline rejects stale props then remains height0; repaired next mount submits current props and reaches natural159x34/frame height34. Before/after captures plans/one-linux-native-measure-race-{before,after}.webp; probe removed, clean release host rebuilt, route push/back and native counter exercised. Review2 and M4 records in plan are current. RAN owned app/uinput/sway shutdown, removed own temporary udev rule, VM one-linux stopped cleanly. Shared worktree remains registered to lead s72425 for integration. CI owner ci-manager through s72425 receives final SHA: checks.yml and relevant iOS/Android workflows, Mac compile/runtime and all wider byte gates remain. No automated tests, main push, PR, publication or paid fallback. Delivery-only work transfers to lead; worker finishes.
