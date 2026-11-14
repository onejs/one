---
id: t-mvnod09z-kek0
title: Build Linux host on both CI architectures and remove dynamic ICU dependency
status: done
active_form: arm64 passed run 40185359129; 000dc373b5 repairs x86_64 libatomic link
owner_status:
  state: landed
  text: worker branch d06fc8339c pushed; run 40186988728 passed both Linux architectures; s72425 owns integration
  updated_at: 1792927266783
assignees:
- s80795
labels:
- one-linux-ci
- one-startup-performance
backend: git
sessions:
- s80795
commits:
- d06fc8339cfa1b710d1b0266050174b2bedce30a
created_at: 1792923502247
updated_at: 1792927291918
field_marks:
  active_form: 1792925974567
  body: 1792927291918
  claim: 1792923502247
  commit_linked:d06fc8339cfa1b710d1b0266050174b2bedce30a: 1792927277289
  evidence_summary: 1792923502247
  owner_status: 1792927266783
  parent: 1792923502247
  priority: 1792923502247
  recovery_ref: 1792923502247
  status: 1792927266783
  title: 1792923502247
---
Worker for s72425. Branch tm/one-linux-ci from origin/tm/one-linux-native. Add standalone native workflow using shared install action, build core/host and linux-basic, prove headless Wayland content paint on ubuntu-24.04 x86_64 and arm64. Follow Hermes upstream portable ICU strategy. Push only worker branch; no PR, release or merge. CI owner ci-manager, worker explicitly assigned run iteration.

RAN actionlint, bash syntax checks, embedded Python syntax and diff whitespace checks. INFERRED upstream Hermes static ICU choice from pinned CMake and Linux compiler workflow. Pending source build, static ICU ELF dependencies and headless RN content paint on x86_64 and arm64; no production check. Branch tm/one-linux-ci, CI owner ci-manager; worker owns run iteration per lead brief.

TESTED run 40184422620 failed at shared Hermes link on x86_64 and aarch64 with non-PIC relocations in Ubuntu libicuuc.a. Added cached static PIC source build of ICU 74.2 with verified SHA-256 and wired ICU_ROOT into Hermes. No local heavy builds or VM services started. Remaining: both complete host builds and first-content screenshots.

TESTED aarch64 completed core+host source build, no ICU ELF imports in VM/compiler, bytecode fixture build and first RN content screenshot. Captured Home with One on Linux text. x86_64 PIC ICU succeeded but core smoke link lacked __atomic_load/store from RN atomic optional<double> flags; added atomic to Linux core public dependencies, preserving installed RN source. Next run must pass both entries.

TESTED run 40186988728 at 000dc373b564824948e82c403a0a47985a40bdb2 passed x86_64 ubuntu-24.04 and aarch64 ubuntu-24.04-arm source core/GTK host builds, ELF no-ICU checks for VM/compiler, embedded bytecode consumer and headless RN first paint. Both screenshots inspected. Final branch head d06fc8339c adds only plans/one-linux-native.md evidence. Artifacts: https://github.com/onejs/one/actions/runs/40186988728 ; durable local evidence /Volumes/Samsung-1TB-990/one-linux-ci-evidence, owned by lead s72425 for handoff. Remaining: lead integrates into held minor; ci-manager wider platforms and delivery. No production rollout, publish, PR or shared branch push; deb/Flatpak not rebuilt. Earlier run 40185359129 also passed arm64.

Cleanup RAN: owned staleness watcher stopped, initial empty branch removed. tm worktree remove returned kept only by this session processes 8758/8806/10957; clean/published worker tree is released when this session exits. Evidence/handoff remains outside tree, live recipient s72425. No shared worktree hold or VM resources.
