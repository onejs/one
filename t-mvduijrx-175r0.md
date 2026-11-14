---
id: t-mvduijrx-175r0
title: 'React state layer for SDK objects: observable objects, KVO and async sequences as hooks'
status: done
assignees:
- s52029
labels:
- one-ios-sdk
- pr-961
parent_id: t-mvd7hx3j-14wo0
backend: git
sessions:
- s52029
commits:
- eb36b2d40
created_at: 1792329176733
updated_at: 1792340492308
field_marks:
  active_form: 1792329176733
  assigned:s52029: 1792330733789
  body: 1792340395138
  claim: 1792340492308
  commit_linked:eb36b2d40: 1792340276618
  evidence_summary: 1792329176733
  owner_status: 1792329176733
  parent: 1792329176733
  priority: 1792329176733
  recovery_ref: 1792329176733
  status: 1792340276719
  title: 1792329176733
---
launch pending on air-32 (lt-e7f64e7e69802630bbb8c85d9f2e8674, slug one-sdk-state-hooks, group lg, worker permissions); do not relaunch until resolved

running as s52029 (one-sdk-state-hooks2, studio-64). Federated attempt lt-e7f64e7e69802630bbb8c85d9f2e8674 (air-32) never confirmed; if it starts later, stop it as a duplicate.

lead review (s50803), 2026-10-18: eb36b2d40 API matches the approved shape (useSDKProperty with generator-chosen kvo or tracking, useSDKSequence over a publisher or AsyncSequence); every sender and receiver of the removed kind argument is updated (Nitro spec, HybridOneSDK, runtime table protocol, generated tables, wire, react). Lead still runs the Foundation and UIKit generator sil check after pulling, then the shared refresh with eb36b2d40.
