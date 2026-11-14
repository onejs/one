---
id: t-musr30xy-1sz40
title: One UI native docs with composited screenshots (Pager first)
status: done
assignees:
- s8153
labels:
- branch:one-ui-docs
- branch:tm/one-widgets-hero-s8153
- lane:one-ui-docs
- review:m19584
- umbrella:apps/onestack.dev
backend: git
commits:
- 164d8e805
- ac8df1c472118d671004f1be1e13bf65c69974a3
created_at: 1791053623942
updated_at: 1791077427768
field_marks:
  active_form: 1791053623942
  body: 1791077427768
  claim: 1791053623942
  evidence_summary: 1791053623942
  parent: 1791053623942
  priority: 1791053623942
  recovery_ref: 1791053623942
  status: 1791076660245
  title: 1791053623942
---
REVIEW: m19584 reviews the assembled lane once. Docs child b1566ecf3 and approved component/iOS/Android heroes are on One v2-beta. Nate directly approved the Widgets share-file-s8153-81404dd5cb7b5bcc-1a104718cdf-1dd34be3c3ea0f18. The two-file Widgets addition164d8e805 was merged and pushed to v2-beta as ac8df1c472118d671004f1be1e13bf65c69974a3. RAN merged diff byte-identical to approved patch; hero SHA36c7d80d3a8e4f4fb69e73a8e529100ec55dacc82762fb64f21be894427bd6a6. One main and held APIs remain held.

RAN real iOS27 OneBasic WidgetKit Home Screen capture fromb1566ecf3: Write JSX widget produced One,84 from React,progress2/3 through actual shared app group. Both app and extension strictly signed; shared Mach-O entitlement verified. NativeDocs124pass/0fail on hero branch. RAN actual uninstrumented docs before/after: HTTP200, expected heading/title, zero page errors and failed HTTP requests; baseline no hero, after complete1600x1000 hero. Inspected quality90 full-size side-by-side shared and approved by Nate.

RAN targeted One web rebuild at164d8e805,2179artifact files, then canonical dev cache cleanup exercised existing reviewed navigation-alpha fix81558502b. Stale SSR module requested undefined NavigationContent; refreshed module uses render(children), then unchanged browser assertions pass. No routing/API source or manifest/lock change. Existing Tamagui2.x TS7 fix artifacts19525hashes/0mismatches used only in isolated rig; release installer nested-copy issue recorded globallyt-mut2ekid-1lh10.

All resources closed; signed native app/extension and cited hashes, source/build archives, native/browser captures retained. Studio source clean27G apparent→161M, unused pro128 build rig4.0GiB→146M after build never started. Foreign old-tree type drafts untouched. Proofs in Contrast scripts/tmp/widget-docs-s8153; landing-identity.json binds approved and merged patch. Both Studio docs worktrees removed after stopping the exact owned staleness watcher; published source branch/merge and all private proof archives retained.

CI owner m19584; pushed SHAac8df1c472118d671004f1be1e13bf65c69974a3. Expected One Checks and release.yml v2-beta canary pipeline; local validation above. Docs/image-only delta adds existing NativeHero; no native package/source change. No second CI watcher started. Contrast goal4 assembled review record is in plans/contrast/mobile-app/one-native-next.md. Engine first-presented repair/integration remains separate withr54491.
