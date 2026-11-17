---
id: t-mvlluj05-1oru0
title: Remove the remaining native Mac composer button bezels
status: done
labels:
- native-ui
- one-macos
parent_id: t-mvlcdlx0-4px0
backend: git
sessions:
- s72325
commits:
- 77a2187a0a915bd9846e239a9b83ec2a9ce4c1a6
- 947c29c8ed2e9a9067456cf34def3504795e7f42
created_at: 1792798348469
updated_at: 1792800673631
field_marks:
  active_form: 1792798348469
  body: 1792798348469
  claim: 1792800673631
  claim_current:b8dd94721050f752ef50fbdfd300e88d: 1792800673631
  claim_state:b8dd94721050f752ef50fbdfd300e88d:1792800673631:~:~:~:o:c541c9f0af1e400606b0da6e4613177e: 1792800673631
  claim_state:c541c9f0af1e400606b0da6e4613177e:1792798403654:=s72325:=mc-3aa87nk0z4j17:1792798403654:f: 1792798403654
  commit_linked:77a2187a0a915bd9846e239a9b83ec2a9ce4c1a6: 1792800616090
  commit_linked:947c29c8ed2e9a9067456cf34def3504795e7f42: 1792800607962
  evidence_summary: 1792798348469
  owner_status: 1792798348469
  parent: 1792798348469
  priority: 1792798348469
  recovery_ref: 1792798348469
  status: 1792800626700
  title: 1792798348469
---
Continue the owner-approved native Mac fidelity work. Current actual app uses bezeled NSButton for small terminal and attachment footer icons. Keep native controls; expose minimal AppKit bordered control in One, default preserving current callers, and use it for the small Mac composer footer buttons. Validate native default/borderless/disabled/action/update behavior and actual Mac footer. One feature main/stable held; branch canary permitted. Existing CI103700 owns workflows, lead s69213 owns independent review and containing published artifact acceptance. Source plan plans/contrast/one-macos-resume.md and spec specs/one-macos-native.md.
