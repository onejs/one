---
id: t-mvbqrdzs-ogo0
title: Default One production builds to two workers in the next release
status: done
assignees:
- s47560
labels:
- lane:one-release
backend: git
created_at: 1792201938328
updated_at: 1792209154091
field_marks:
  active_form: 1792201938328
  body: 1792209154091
  claim: 1792201938328
  evidence_summary: 1792201938328
  owner_status: 1792201938328
  parent: 1792201938328
  priority: 1792201938328
  recovery_ref: 1792201938328
  status: 1792209154091
  title: 1792201938328
---
Nate direct2026-10-16 HST, responding to recovered production-worker chart: "keep the two workers default and ... get that into the next one release ... one agent already doing the release". APPROVED One default build concurrency TWO, workers remain enabled. Existing explicit config/environment overrides retain precedence and work; disable-workers option remains available. This is a framework default change, not merely a benchmark flag. Owner existing s47560/one-owner handles next planned release (latest original turns show2.8.0 published and2.8.1 work active), no duplicate publisher or retroactive2.8.0 modification.
Record exact dated quote in existing One build/release spec and Contrast comparison plan before work. Implement in existing release branch/PR alongside approved next-release scope, focused actual default/override/production build behavior validation and existing other-model review, release notes mention memory/speed tradeoff. Normal release path and existing version scope, no extra unrelated feature or review chain. Verify packed npm artifact uses default2 before claiming shipped. Prior benchmark3rotatedbuilds/195pages onbusyhost: Start1.32GiB19.8s, One8workers3.37GiB8.2s, One2workers1.83GiB11.3s, workersoff1.37GiB16.5s; rough timing and historical versions explicitly labelled. Existing OSSp92180 owns refreshed publishable comparison using approved2worker default after implementation; it must not duplicate your default source edit. CIp91951 owns normal workflow followups. User chose two, not zero. Do not ask default decision again. Update result/task with implemented, release candidate and actual published proof distinct.

Implemented: One PR 943 merged to main as 65ace9dd4 (default concurrency max(1, min(cores, 2)), workers on, overrides kept). RAN: tests/test-loaders one build: default workers: 2, ONE_BUILD_CONCURRENCY=4 workers: 4, ONE_BUILD_WORKERS=0 concurrency: 2. Codex review APPROVE (14 behavioral cases). Quotes recorded in contrast plans/contrast/mobile-app/one-expo-sdk-58.md (land queued). Release candidate: 2.8.1 from main, waiting on Nate's go (tm ask i-1792203715017-45968-0). Published proof: not yet.

Published: one@2.8.1 on npm, tag v2.8.1 (release bump 9c7de1d42 on main 4b9c2fbd4). RAN: npm pack one@2.8.1: releaseSourceCommit 9c7de1d4, dist/esm/cli/build.mjs has Math.min(cpus().length, 2).
