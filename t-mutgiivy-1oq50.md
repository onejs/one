---
id: t-mutgiivy-1oq50
title: Speed up Contrast mobile native dev bundles
status: done
labels:
- branch:perf/native-bundle-speed
- lane:one-native-bundle-speed
- umbrella:plans/2026-10-04-daily-sweep.md
- umbrella:plans/one-native-launch.md
backend: git
commits:
- 1cacb7ee4d755ace1fbac5b68a49679ebf532bf7
- 297b51a3751055276ce0f65de1f658d2304531c2
- e40d0771af
created_at: 1791096337438
updated_at: 1791099574892
field_marks:
  active_form: 1791096337438
  body: 1791099574892
  claim: 1791096337438
  evidence_summary: 1791096337438
  parent: 1791096337438
  priority: 1791096337438
  recovery_ref: 1791096337438
  status: 1791099574866
  title: 1791096337438
---
RAN: landed One v2-beta 1cacb7ee4d755ace1fbac5b68a49679ebf532bf7 (lazy Cloudflare plugins) and 297b51a3751055276ce0f65de1f658d2304531c2 (benchmark/evidence). Contrast e40d0771afff7bfeef0a2041a409c536b57eb0f2 verified ancestor of origin/main; Babel config absent. Owner s9029 published due known repository-scope guard defect t-mutdjr1u-v5o0; no bypass. Air-24 Contrast clean, synced 3e26e433f9. TESTED: three counterbalanced cold live-engine medians iOS 21.738->16.067s (-26.1%), Android 28.659->18.051s (-37.0%); slow third samples retained. Cached requests 0.107-0.269ms; hashes match. Wrangler config median 622.488->213.492ms; zero disabled modules/profile samples, enabled positive control works. RAN: 21 One tests, oxlint, 17-package local release into Contrast, zero template type errors, full precommit checks plus 2 selected units; actual both-platform dev and prod native CLI/Hermes builds pass. Source maps contain 4588 iOS and 4603 Android sources. Evidence plans/one-native-launch.md. No OTA uploaded. CI owner s9029: One Release/checks, Contrast validation/build-ios/OTA; canary artifact unverified, local source outputs exercised downstream. Clean pushed worktrees retained: studio-64 ~/.worktrees/one-one-native-bundle-speed perf/native-bundle-speed at297b51a375; air-24 ~/.worktrees/one-native-bundle-speed perf/native-bundle-speed-air24 at1cacb7ee4d. No implementation blockers. INFERRED next optimization: profile remaining dependency Flow stripping and Hermes class lowering.
