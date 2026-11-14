---
id: t-mvkt0pqz-fl30
title: Repair native Mac input and aborted blob lifetime defects
status: done
active_form: repairs pushed eeb26145c7; exact wait w-f75bb1 for native app build before final paste/composition/fixture proof
owner_status:
  state: landed
  text: clean pushed producer eeb26145c7; native blob/input and controlled uppercase probes pass; independent review/delivery lead s69213, CI ci-manager
  updated_at: 1792752124842
labels:
- lane:one-macos
- umbrella:one-macos-native
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69674
commits:
- 228a4e3d93cace18ee671d41d01040474fbb5fa8
- e9bde62ec4bd09b44edae48d07c0823a43fde6db
- eeb26145c7449ad6e255f1dd27ffaaf9b0a83582
created_at: 1792749928283
updated_at: 1792752311455
field_marks:
  active_form: 1792751404610
  body: 1792752124842
  claim: 1792752311455
  claim_current:5a2b044f9462b2d4414bc38bbea84271: 1792752311455
  claim_state:5a2b044f9462b2d4414bc38bbea84271:1792752311455:~:~:~:o:f78b8889393757b1f042fdf7f8b2b4e9: 1792752311455
  claim_state:f78b8889393757b1f042fdf7f8b2b4e9:1792749967062:=s69674:=mc-3aa87nk0z4j17:1792749967062:f: 1792749967062
  commit_linked:228a4e3d93cace18ee671d41d01040474fbb5fa8: 1792750548328
  commit_linked:e9bde62ec4bd09b44edae48d07c0823a43fde6db: 1792751188402
  commit_linked:eeb26145c7449ad6e255f1dd27ffaaf9b0a83582: 1792751404477
  evidence_summary: 1792749928283
  owner_status: 1792752124842
  parent: 1792749928283
  priority: 1792749928283
  recovery_ref: 1792749928283
  status: 1792752124842
  title: 1792749928283
---
Independent Opus review exposed source defects: failed/aborted blob responses are retained without a BlobCollector; maxLength slices surrogate/composed sequences and trims marked text outside undo; NSButton image position is stale when title changes. Lead read causes. Repair on producer branch preserving original authors and feature history; native failure probes and existing app fixtures, no full gate. Also record existing display-link mutex callback invariant after reading its dependencies. Separate generic logging defect belongs to current RootView/Modules author s69591. CI owner ci-manager; independent review required before feature delivery.

Lead correction: Button title-only Swift setter finding does not establish public React defect. Actual ComponentView.updateProps always sets title followed by systemImage, so imagePosition is recomputed even when image string unchanged. Asked author to omit speculative Button repair unless actual public React transition fails. Networking error/abort retention and composed-input truncation remain confirmed source causes requiring runtime proof.

TESTED networking: actual manager + counting BlobStore, partial 7168-byte transport failure and abort produce zero stores and no blob event; successful bytes resolve/release. Commit 228a4e3d93. Button edit withdrawn following lead caller audit; no Swift diff. Native input compile passes; actual editor probes pending archive completion. CI owner ci-manager; lead owns independent review and delivery.

TESTED actual native component insertion: emoji/combining/ZWJ limits, middle replacement, undo/redo and ordinary maxLength pass. TESTED AppKit plaintext paste bypasses insertText; pre-paste-fix component probe reproduces ab🌊Z exceeding the budget. Added committed-editor shouldChange coverage for that route with the same clipping helper. Final runtime proof waits for the single current app build/archive writer; earlier premature links rejected a partial archive, not a source compiler failure.

Source clean/pushed on tm/macos-resume, three commits228a4e3d93/e9bde62ec4/eeb26145c7. Exact wait w-f75bb1 watches current app build PID24242; keep this worker because its validation requires the build. Resume record /Volumes/Samsung-1TB-990/evidence/one-macos-repairs-s69674/resume.md. No completion/finish yet; final native paste/composition, fixture capture and provenance remain.

TESTED final native editor-proof against successful app-build-verified archive: normal and multiline native editor paths pass emoji/combining/ZWJ insertion, suffix-preserving replacement, undo/redo, native plaintext paste plus undo, intact marked composition over budget, composition commit/unmark, composition undo and zero-length limits. NSSecureTextView passes insertion, paste, replacement and zero-length limits, preserving native secure behavior. Actual controlled React uppercase fixture reports MIXEDCAS after mixedCase123 at maxLength8; appActive=false/windowKey=false. Used unchanged saved input fixture /Users/n8/.team-machine/evidence/one-networking/probe.bundle because freshly served current fixture encounters stale installed One.macOS control exports. No controls/API source edited. External evidence /Volumes/Samsung-1TB-990/evidence/one-macos-repairs-s69674: editor-proof.log, blob-proof.log, inspect-uppercase-final.json, axPress-inactivity.json, uppercase-final.webp and provenance.json. No full gate/performance or current-controls acceptance claim. CI ci-manager; independent review and held feature delivery remain with lead s69213.

CLOSEOUT: final handoff /Volumes/Samsung-1TB-990/evidence/one-macos-repairs-s69674/handoff-s69674.md. Owned app/server stopped, no live watcher/build/children; wait terminal. Warm outputs, signed app copy and clean pushed worktree retained for live lead s69213 per assignment. Remote tip verified eeb26145c7. Owner milestone shared; independent review and feature delivery remain with lead, CI ci-manager.
