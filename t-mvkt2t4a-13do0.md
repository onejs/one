---
id: t-mvkt2t4a-13do0
title: Preserve native JSX imports in mixed module transform
status: done
owner_status:
  state: landed
  text: PR1025 merged 0a5111ab0045bfe767ce6232c45909c43a919687 after independent Opus approval and exact-head green checks/tests; downstream acceptance tracked separately
  updated_at: 1792753589949
assignees:
- m53593
labels:
- lane:metro-to-one
- metro-to-one
- umbrella:plans/contrast/metro-to-one.md
- upstream-one
backend: git
sessions:
- s69676
commits:
- 8ca8aa92c1a348743d94e4e63d7f46887cc2f4cc
- bc047b892af3e76feab326b4d29da23f3f851857
created_at: 1792750025962
updated_at: 1792753589949
field_marks:
  active_form: 1792750025962
  assigned:m53593: 1792753262809
  body: 1792753589949
  claim: 1792750025962
  commit_linked:8ca8aa92c1a348743d94e4e63d7f46887cc2f4cc: 1792750571034
  commit_linked:bc047b892af3e76feab326b4d29da23f3f851857: 1792752613896
  evidence_summary: 1792750025962
  label_added:lane:metro-to-one: 1792750341188
  label_added:umbrella:plans/contrast/metro-to-one.md: 1792750341188
  owner_status: 1792753589949
  parent: 1792750025962
  priority: 1792750025962
  recovery_ref: 1792750025962
  status: 1792753589949
  title: 1792750025962
  unassigned:s69676: 1792753262809
---
Lead m53593 assignment: second SWC pass classic runtime only, keep first TS stripping preserve. Focused imported View identity regression (js/jsx/tsx) fails baseline ReferenceError and passes fix. Original App source SHA672f3235 render probe preserves imported ScrollView/Text/View. No adjacent type-field detection fix, fixture/assertion/deadline/native interface/catalog edits, merge or publication. Main-targeted PR and isolated --into validation in progress. Evidence /Volumes/Samsung-1TB-990/one-evidence/metro-native-mixed-jsx. CI owner p103700; non-author review routed by lead.

# upstream native mixed-module compiler

Lead m53593; CI/production p103700. Task t-mvkt2t4a-13do0; existing runtime follow-up t-mvacue7c-v2r0 links both commits. PR https://github.com/onejs/one/pull/1025 targets main. Pushed branch tm/metro-native-mixed-jsx: 8ca8aa92c1 classic SECOND SWC pass, bc047b892af3e76feab326b4d29da23f3f851857 separate type-only classification fix. No merge/publication by worker. Parent Opus approved first fix; lead owns follow-up review/merge.

TESTED genuine mixed imported View regression fails before classic fix, passes JS/JSX/TSX afterward. One comprehensive added case (same test file) excludes module/exports type fields/queries, annotations, generics and ambient declarations; runtime assertions, nonnull/instantiation expressions, namespaces, enums and parameter properties evaluate42. Four focused tests pass. Original unchanged App correctly stays ESM after bc047. Compiler dependency build5 packages, targeted lint/format/diff pass. Broader compiler113/116 pass with3 existing5s timeouts; existing selected mixed-engine43/44 pass with1 existing5s timeout. No timeout changes/retries. Both source and built8ca App stub probes preserve imported ScrollView/Text/View identities. Test comment identifies React bundler injection; PR explicitly names createNativeDevEngine native engine classic config, distinct from transformSWC automatic elsewhere.

RAN bun release --into isolated downstream/fixture installed15 packages. installed-proof-8ca8aa92c1.json preserves initial receipt. Canonical frozen install restores published packages. First disposable Bun builtin hook did not fire: production-eight was PUBLISHED, not local. Corrected explicit PATH wrapper then ran real frozen install, local --skip-build family overlay and content verification; local-production-eight compiled actual bc047 with unchanged fixture source/manifest/lock, authentic installed metadata and Rolldown1.2.14 native binding, no override. App-local-emission.{txt,json} proves actual emitted imported namespace ScrollView/Text/View bindings. Both runs stopped BEFORE browser at retained044 Metro asset descriptor malformed. Original8 acceptance NOT passed. Wrappers retired to nonexecutable .txt, bin removed; final proof must use published family, normal manifest/lock/frozen install and no hooks/overlays.

Lead dispatched canary ONCE https://github.com/onejs/one/actions/runs/39942526497 expected bc047b892af3e76feab326b4d29da23f3f851857. CI p103700 owns exact containing family/source/tarball delivery; no second publisher. Lead explicitly owns delivery wait and same-slot continuation. When ready pin published family in isolated fixture via normal manifest/lock, frozen install, verify releaseSourceCommit/content. Run exact copied final canonical harness downstream/runtime/scripts/conformance/popular-packages.ts (blob9f8e0cf2e841c8161e612d266e30990838d67f72), production, original8/deadlines, ports5294/8840/8841, current-engine and tenant from sibling original proof-s69430. Keep metadata/assets authentic and named Worklets result1.

Lead explicitly authorizes EXACT existing ../metro-popular-catalog-inputs/asset-existing.patch from259a3dce6da on retained044 source, validation only, then restore. NOT applied by this worker; retained tree remains clean. Alternative lead integrated consumer7cef/current main, normal retry6b7f662. No reader/catalog/native guards authored or changed. Lead owns consumer integration.

Evidence/artifacts all here outside One tree. Retain downstream fixture/dependencies and runtime source mirror for warm canary continuation, live owner m53593; no services/windows/active waits or children owned. Both waits finished. Root downstream pins untouched. One tree clean/pushed; cleanup receipt follows. No completion mail; this is the single finish handoff.

Handoff finalized outside tree at /Volumes/Samsung-1TB-990/one-evidence/metro-native-mixed-jsx/handoff.md. Retained044 source still clean; exact existing asset-existing.patch authorized by lead but not applied. Own One tree clean/pushed, tm removal held only by own PIDs until session exit. No listeners5294/8840/8841, children, active waits or heavy windows owned. Warm isolated fixture retained for canary continuation under leadm53593 ownership.

RAN independent Opus reviewer s68983 approved exact bc047 on 2026-10-23, including runtime/type-only matrix; first8ca previously approved. Both GitHub checks/tests green on exact bc047. Two nonblocking inferred pure-ESM false classifications (enum member module and abstract field module) left alone absent real package failure, per reviewer scope. Actual8 downstream acceptance remains separate.

RAN gh confirms PR1025 MERGED at 11:06:13Z, squash0a5111ab0045bfe767ce6232c45909c43a919687. No stable publication. Canary39942526497 already dispatched from sourcebc047; p103700 owns delivery and production t-mvacue7c-v2r0, lead owns original8 migration t-mv9k3war-b2b0.
