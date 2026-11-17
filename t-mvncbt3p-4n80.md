---
id: t-mvncbt3p-4n80
title: Implement One DOM JavaScript bridge and component API
status: done
active_form: parent resumed author for mounted hook lifetime dependency-change regression reproduction and bounded repair
owner_status:
  state: landed
  text: mounted handle lifetime repair pushed; before/after real React browser probe reproduces and verifies; parent review and native/CI delivery remain
  updated_at: 1792905016066
labels:
- lane:one-use-dom
- umbrella:one
parent_id: t-mvnc3bb5-1t20
backend: git
sessions:
- p111481
commits:
- 3d7d61fbcd34922b2a9536660a98d0e16ff0caf6
- be87ed7cbd280241c4e7077858fe76e1770074f1
created_at: 1792903290901
updated_at: 1792905016066
field_marks:
  active_form: 1792904792535
  body: 1792905016066
  claim: 1792904527102
  claim_current:eee14ad414930d860df33c6281a07845: 1792904527102
  claim_state:6e7de3834b9bdde2de327b57012c5d95:1792903346077:=p111481:=mc-h39p4gbj818h:1792903346077:f: 1792903346077
  claim_state:eee14ad414930d860df33c6281a07845:1792904527102:~:~:~:o:6e7de3834b9bdde2de327b57012c5d95: 1792904527102
  commit_linked:3d7d61fbcd34922b2a9536660a98d0e16ff0caf6: 1792904295496
  commit_linked:be87ed7cbd280241c4e7077858fe76e1770074f1: 1792905015740
  evidence_summary: 1792903290901
  owner_status: 1792905016066
  parent: 1792903290901
  priority: 1792903290901
  recovery_ref: 1792903290901
  status: 1792905016066
  title: 1792903290901
---
Approved runtime helper slice2 of2. Own src/dom JS types/bridge/proxy/browser entry only; same shared pro128 One managed feature tree. No native implementation, build hooks, package exports or fixture. See launch brief for exact agreed entry API, lifecycle/serialization and scope. REVIEW: Opus s78888 cross-reviews after account resumes; Sol lead s78716 integrates; CI p110356 broad checks.

TESTED: 3d7d61fbcd adds only src/dom/** and OneDOMHostNativeComponent.ts. Disposable runtime probe covers value/void/errors, rejected unsupported data with paths, latest committed callbacks, undefined/optional removal, message dedup, ready revision reconciliation, pending calls rejected on dispose/reload/unmount, stale replies, epoch isolation, malformed/duplicate messages and subscription cleanup. React adapter probe uses real React StrictMode and Suspense with a simulated host; a new document started during suspended render captured committed state/callbacks, then resumed commit reconciled. Headless installed Chrome exercised two browser mounts, actions/refs, native-constrained-width size reports, stale handles and inline web pending-call rejection, no page errors. Focused strict TypeScript, oxlint, oxfmt, Fabric codegen schema parser passed. Evidence /Users/n8/.team-machine/evidence/one-dom-runtime includes probe source/logs, browser-proof.png and host-contract.md. Native transport/origin/resource/navigation/device layout/keyboard/performance unproven; same Opus reviews and parent/CI own remaining delivery. Shared tree retained for registered parent/build/integration owners; no release or merge performed.

INFERRED parent source review: index.ts creates binding.lifetime per factory deps and effect cleanup rejects pending methods on deps change, which may reject a valid async method that changes local state while component remains mounted. Same author p111481 resumed once for focused hook proof and repair if reproduced, preserving pushed3d7d61fb source and other authors. Probe desired: pending method survives factory dependency update and settles, later calls use latest committed handler, actual unmount rejects. No repeated broad tests or duplicate source author.

TESTED follow-up be87ed7cbd: before repair, real React StrictMode in installed Chrome started a deferred imperative method, committed a factory dependency change while mounted, then resolving it yielded DOM_DISPOSED (dependency-before.log). After separating mount/document lifetime from factory registration, the same call resolves. Expanded focused dependency-after.log passes deferred inline AND hosted native-peer calls through dependency commits, a method updating its own dependency, retained refs selecting latest committed methods, removed methods rejecting new calls while existing removed-method calls finish, speculative suspended factories remaining hidden until commit, and actual unmount rejecting pending/stale calls. No page/runtime errors. Strict TypeScript for affected hook, oxlint and formatting passed. Only src/dom/index.ts and its README changed; no native/build/fixture edits. Native/device proof remains unestablished and independent review remains with same Opus/lead.
