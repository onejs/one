---
id: t-mvj6t5k8-ps10
title: Resolve CoreNFC C++ interop SIL compiler dependency
status: done
owner_status:
  state: needs
  text: 'parent p103481 review of PR #1010; source delivered, p96184 owns CI and author65565 owns full native oracle'
  updated_at: 1792652689370
assignees:
- s65660
labels:
- lane:compiler-dependency
- umbrella:sdk-bindings
backend: git
sessions:
- s65660
commits:
- 5685eb2a1672c32fed7630f0a6b07efe821127f2
created_at: 1792652157800
updated_at: 1792652715233
field_marks:
  active_form: 1792652157800
  body: 1792652715233
  claim: 1792652157800
  commit_linked:5685eb2a1672c32fed7630f0a6b07efe821127f2: 1792652633469
  evidence_summary: 1792652157800
  owner_status: 1792652689370
  parent: 1792652157800
  priority: 1792652157800
  recovery_ref: 1792652157800
  status: 1792652675800
  title: 1792652157800
---
Parent p103481; linked Contrast compiler task t-mvj6ro0h-yo20 and capture task t-mvj4khug (author65565). Diagnose Swift 6.4 CoreNFC async overlay SIL crash preserving C++ interop and complete API coverage. Source base a5522514c820659b8c2e3c19c4bf2b95f4fdd812. No full oracle or downstream producer.

TESTED: original complete CoreNFC table crashes MandatorySILLinker on both iOS 27.1 SDKs with Swift 6.4.0.34.1, C++20 interop and explicit modules. Source repair retains 272 entry manifests and 20 existing skips byte-for-byte and emits SIL exit0 on device/simulator under both -Onone and -O. Four response-flag async overlays use public Result overloads plus checked continuations. Evidence /Users/n8/.team-machine/evidence/s65660-corenfc. Contrast linkage: t-mvj6ro0h-yo20 blocks t-mvj4khug; author65565 retains sole full oracle/engineJSprep. Parent p103481 reviews source; p96184 owns broader CI. Initial focused JS test attempt could not resolve vitest in isolated tree; checking installed primary dependencies.

TESTED: focused existing sdk-entry-identity and sdk-objc-generics suites passed, 2 files / 9 tests, using installed primary dependencies through an owned temporary symlink. Complete CoreNFC metadata comparison: 272 entries, 20 existing skips identical; all four affected async cases compile with explicit C++20 modules on device and simulator at -Onone/-O. Original complete table crashes on both. No downstream generated cache, JSON, pins, scripts, producer or simulator changed.

TESTED: four individual native async probes authenticate/keyUpdate/readBuffer/sendRequest each crash exit -11 before repair, confirming every changed method independently. Commit 5685eb2a16 retains collision repair a5522514c820659b8c2e3c19c4bf2b95f4fdd812. Remaining acceptance belongs to parent p103481 source review, p96184 CI, and existing author65565 complete native oracle after regeneration with source repair.

PR https://github.com/onejs/one/pull/1010. Commit 5685eb2a1672c32fed7630f0a6b07efe821127f2 verified on origin/tm/corenfc-cxx-sil. No publication/workflow dispatch. Initial plain Swift control from author65565 was valid only after removing both C++ flags; stale no-cxx log was not used. Only installed Xcode 27.1 exists; no supported alternate toolchain installed. Primary official Swift C++ setup documentation consulted: https://www.swift.org/documentation/cxx-interop/project-build-setup/ .

Cleanup: tm worktree remove reports kept only by this session harness processes, release on session exit. Worktree is clean/pushed; external evidence intentionally retained. Final handoff /Users/n8/.team-machine/evidence/s65660-corenfc/handoff.md. No owned resource windows or children.
