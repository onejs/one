---
id: t-mvndk4wt-1bcg0
title: Document the approved One DOM component API
status: done
owner_status:
  state: landed
  text: docs committed and pushed 31817770e7; focused MDX render, linked TSX API and link checks pass; lead integrates and Opus batch review pending
  updated_at: 1792905852246
assignees:
- p111479
labels:
- lane:one-use-dom
- umbrella:one
parent_id: t-mvnc3bb5-1t20
backend: git
sessions:
- p111479
commits:
- 31817770e76f2ab881647dffbc3ad22e6db702f3
created_at: 1792905359069
updated_at: 1792905919613
field_marks:
  active_form: 1792905359069
  body: 1792905852246
  claim: 1792905919613
  claim_current:240bc6dfa1427745e706553436b41ad8: 1792905919613
  claim_state:240bc6dfa1427745e706553436b41ad8:1792905919613:~:~:~:o:d95f626b1a48111a15eb1bd280eb9532: 1792905919613
  claim_state:d95f626b1a48111a15eb1bd280eb9532:1792905442478:=p111479:=mc-h39p4gbj818h:1792905442478:f: 1792905442478
  commit_linked:31817770e76f2ab881647dffbc3ad22e6db702f3: 1792905847971
  evidence_summary: 1792905359069
  owner_status: 1792905852246
  parent: 1792905359069
  priority: 1792905359069
  recovery_ref: 1792905359069
  status: 1792905852246
  title: 1792905359069
---
Continue same approved build-helper slot on useful independent feature documentation. Own new apps/onestack.dev/data/docs/guides-dom-components.mdx plus precise guide navigation/FAQ updates only. Read actual src/dom API and build README, reflect experimental/unreleased status and unproven native support honestly. Product API examples, binary rebuild, data/actions/async refs, browser graph/SSR/asset/navigation/lifecycle limits. No new performance claims, shipping/release declaration, source/runtime/build/native edits. REVIEW: same Opus batch then lead s78716 integrates; CI p110356 broad delivery. Feature branch remains held from minor/release inclusion.

# DOM docs handoff

Task t-mvndk4wt-1bcg0, worker p111479, lead s78716. Branch tm/dom-components on pro128.
Base for docs: be87ed7cbd280241c4e7077858fe76e1770074f1.
Ordered docs commit: 31817770e76f2ab881647dffbc3ad22e6db702f3, verified on origin/tm/dom-components.
Prior build slice 9be2e8b193 remains done; no build recheck in this task.

Changed only new guides-dom-components.mdx, precise Native guides card/nav entry, and outdated FAQ sentence. Explains actual API, linked native parent/browser examples, value/void/error refs, data/path failures, imported assets, SSR, navigation, document lifetimes, binary rebuild and experimental limits. Incorporated lead's corrected RN0.88 app minimum Android API24, iOS17 target, and modern WebView requirement. Vite installed baseline chrome111/ios16.4 read directly; RN app minimum relayed by lead's installed gradle observation, not device proof here. No shipping/version/performance claims.

TESTED: installed getMDX from packages/mdx-rust/src with default syntax highlighting compiled all three changed MDX pages; getMDXComponent plus ReactDOM server-rendered them. The three TSX blocks type-check together against actual src/dom/index.ts, existing One declarations and Vite asset declarations. All three guide local links exist; new guide appears once each in guides, FAQ, docsRoutes. Targeted oxfmt navigation check and staged diff whitespace check pass. Initial probe setup corrected TS7 compiler API assumption and included Vite's real asset declarations; final run passes.
Evidence: docs-proof.ts, docs-proof.log, docs-result.json, docs-snippets/, and three *-render.html under this directory. No available site server, full site build, browser screenshot, native/device or Updates proof performed. No new test suite or dependency install.

Remaining delivery: parent s78716 integration review; same s78888 independent batch review; p110356 owns broad CI. Native host/device/Updates proof remains separate. Feature branch only, no main/merge/release authority. No blockers for docs slice.

Shared retained tree /Users/n8/.worktrees/one-dom-components remains registered for s78716/s78888/runtime co-tenant p111481. Their uncommitted native/package/fixture changes preserved. Own four doc paths clean. No owned server, child, resource lock or wait to transfer. Evidence stays outside tree. Parent retains tree; do not remove it.
