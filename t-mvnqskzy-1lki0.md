---
id: t-mvnqskzy-1lki0
title: Separate Vite DOM fixture from Android Metro routes
status: done
owner_status:
  state: landed
  text: fixture repair pushed tm/macos-resume; review s69213 and broader CI p110356 remain
  updated_at: 1792927858901
assignees:
- s80952
labels:
- lane:android-fixture
- umbrella:one-native
parent_id: t-mvmxttgh-12vf0
backend: git
sessions:
- s80952
commits:
- 509107dc0697f72bbb9e7eaddd2468b8732020dc
created_at: 1792927588174
updated_at: 1792927858901
field_marks:
  active_form: 1792927588174
  body: 1792927858901
  claim: 1792927588174
  commit_linked:509107dc0697f72bbb9e7eaddd2468b8732020dc: 1792927858666
  evidence_summary: 1792927588174
  owner_status: 1792927858901
  parent: 1792927588174
  priority: 1792927588174
  recovery_ref: 1792927588174
  status: 1792927858901
  title: 1792927588174
---
Repair fixture boundary only on held tm/macos-resume. Reuse CI40184743386 compose-b before log, prove default Android Metro bundle and dedicated Vite DOM entry with bounded probes. Review lead s69213; broader checks CI p110356.

RAN exact retained CI40184743386 compose-b log copied from Pro128. Minimal fixture diff removes app/one-dom.tsx; documents existing ONE_ROUTER_ROOT=fixtures/dom-app ONE_NATIVE_BUNDLER=rolldown entry. First bounded probe fails before server startup on stale dist import @vxrn/utils/macosReactNativeResolve. Lead asked about prerequisite JS build ownership; no runtime source changed.

TESTED after refreshing stale vxrn and One JS prerequisites: Android default Metro0.87.1 dev/lazy HTTP200 17532909 bytes, retained app/index.tsx, app/one-native-android.tsx, app/one-native-android-compose-family.tsx, app/deep-link/[id].tsx; fixtures/dom/ProofPage.tsx absent. Dedicated ONE_ROUTER_ROOT=fixtures/dom-app ONE_NATIVE_BUNDLER=rolldown Android bundle HTTP200 9587726 bytes includes fixture and DOM proxy; registered DOM HTML HTTP200. Exact CI before failure retained. No public runtime/guard/assertion changes, native rebuild, emulator, reset or publication. git diff --check passes. Generated route files preserved externally and own generated changes removed. Lead retains shared tree and unrelated Mac edit. Evidence ~/.team-machine/evidence/one-macos-resume-s69213/android-fixture-repair. CI p110356 owns affected Android workflow delivery; lead s69213 owns review.
