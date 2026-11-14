---
id: t-mvngjxqe-235d0
title: Gate the remaining One iOS framework hub and measure startup
status: canceled
labels:
- ios-linkset
- one-startup
parent_id: t-mvluzwx4-za50
backend: git
sessions:
- r128154
commits:
- 3a2e34ed715b09f2a93cb010f6a92cd11d6c5e54
created_at: 1792910388614
updated_at: 1792911048892
field_marks:
  active_form: 1792910388614
  body: 1792911048637
  claim: 1792911048637
  claim_current:7c37b462477f4357516fbc0efc02d697: 1792911048637
  claim_state:14ab5fddb261bd130a38cb9b408b9cc3:1792910411854:=r128154:=mc-12ehvc19fsga:1792910411854:f: 1792910411854
  claim_state:7c37b462477f4357516fbc0efc02d697:1792911048637:~:~:~:o:14ab5fddb261bd130a38cb9b408b9cc3: 1792911048637
  commit_linked:3a2e34ed715b09f2a93cb010f6a92cd11d6c5e54: 1792911048892
  evidence_summary: 1792910388614
  owner_status: 1792910388614
  parent: 1792910388614
  priority: 1792910388614
  recovery_ref: 1792910388614
  status: 1792911048637
  title: 1792910388614
---
Extend PR1042 group mechanism at 367d7ff4d1. Gate remaining framework importers and SDK binding objects without fingerprint edits. Validate Release no-group, Debug all, Release feature and interleaved RN/before/after launches. Lead s72425; CI owner ci-manager; held minor branch only.

Owner canceled further startup optimization on 2026-10-25 UTC through s72425: we do not need to optimize startup anymore. Docs-only stop record 3a2e34ed71; no runtime changes landed. Latest prior timing remains 233 ms RN / 586 ms One, gap 353 ms. Unvalidated draft preserved at /Users/n8/builders/one-ios-linkset4/unfinished.patch and unfinished-notes.md, removed from delivery branch. No simulator/app/native build/timing created. Codegen Swift typecheck stopped. CI owner ci-manager; no new native checks required because implementation was canceled.
