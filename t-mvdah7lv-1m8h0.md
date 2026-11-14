---
id: t-mvdah7lv-1m8h0
title: Preserve Metro semantics for mixed native modules
status: canceled
owner_status:
  state: needs
  text: p94807 review of a8a18d5d7c; p94655 owns CI and integrated conformance
  updated_at: 1792299085317
labels:
- lane:mixed-esm-cjs
- umbrella:metro-to-one
backend: git
sessions:
- p94864
commits:
- a8a18d5d7c
- b72a68c156
- c87781fe1b
created_at: 1792295521987
updated_at: 1793089847519
field_marks:
  active_form: 1792295521987
  body: 1793089847519
  claim: 1792301927121
  commit_linked:a8a18d5d7c: 1792299085603
  commit_linked:b72a68c156: 1792296089464
  commit_linked:c87781fe1b: 1792298016954
  evidence_summary: 1792295521987
  owner_status: 1792299085317
  parent: 1792295521987
  priority: 1792295521987
  recovery_ref: 1792295521987
  status: 1793089847519
  title: 1792295521987
---
Direction 2026-10-17 from p94655: "fix it in One ... never patch the third-party package or the fixture". Reproduce mixed ESM/CommonJS exports, validate require and import consumers, push PR; CI and integrated conformance owned by p94655.

RAN: baseline focused dev/prod regression both failed with ReferenceError: module is not defined. TESTED: initial repair passed full owning file (128 tests). Adversarial assessment found SWC getter exports differ from Metro writable Babel exports; final repair uses Babel CommonJS lowering with scoped detection. Installed package scan confirms pattern in quick-crypto/src/index.ts, reanimated/src/mock.ts, worklets/src/mock.ts, push-notification/component/index.ios.js, segmented-control native component. Integrated harness and CI remain p94655 responsibility.

Final compiler path uses Babel CommonJS (not SWC) to preserve writable export properties. Added adversarial writable-export assertion. One intermediate full run had 128 passing and a 5s timeout in existing native async through metro-module; no retry logic or timeout changes. Full suite on final source is in flight.

TESTED final: tm window run heavy admitted after 197s; full createNativeDevEngine.test.ts passed 129/129 in 3.59s. Source b72a68c156 pushed. Retain clean worktree /Users/n8/.worktrees/one-mixed-esm-cjs on published branch for PR corrections and integrated harness; live owner p94655. No fixture modifications, release installs, owned services, or active watchers.

PR https://github.com/onejs/one/pull/964 sent to p94655 and assigned batch reviewer p94807. Helper assignment complete. p94655 owns review routing, CI checks and integrated popular-package conformance. Branch and clean worktree retained for corrections.

2026-10-17 direction, scope PR #964 native mixed-module correction: Nate (2026-10-11, Contrast plans/contrast/metro-to-one.md): "No, we shouldn\x27t need Babel ... we got rid of all 100% of all babel." Lead p94655 explicitly requests Oxc detection, SWC lowering, no shared fixture release, and reviewer regression tests for bare references and Metro top-level this/strict semantics. Compiler dependency build passed; first native implementation full test file passed 144/144. Further native export edge cases under validation.

TESTED final correction c87781fe1b: frozen install and 15 dependency build tasks passed; compiler build and full createNativeDevEngine.test.ts passed 154/154 via admitted heavy window w-f06377. RAN failure challenge: logical assignment differed from actual Metro oracle, corrected without weakening assertions; final full file passed. PR #964 body/comment updated. Review p94807; CI, integrated conformance and landing owner p94655. Expected PR workflows remain CI-owned. No shared fixture install, release, services or active waits. Clean pushed worktree retained for review under live owner p94655. Owner direction is the existing 2026-10-11 no-Babel quote in Contrast plan, applied only to mixed native runtime lowering.

TESTED latest correction a8a18d5d7c: final compiler build and full createNativeDevEngine.test.ts passed 166/166 in admitted w-16ad70. Exact independent reviewer repros added: generated exports capture, for-of/in writes, TypeScript enum writable export. Fix uses hygienic wrapper-binding access, iteration publishing, and SWC TypeScript runtime lowering before writable export edits. Added TSX, namespaces, wrapper reassignment, loop shadows and TS source-map checks. Removed original added unused Babel module/TS compiler dependencies and corresponding lock entries. PR body/comment updated, reviewer p94807 notified, p94655 owns CI/integrated conformance and landing. Clean pushed worktree retained for review with p94655 as live owner.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mvdah7lv-1m8h0 --status open`.
