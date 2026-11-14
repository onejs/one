---
id: t-mrj3yhsb-alu0
title: Review One NativeTabs platform split for Chat release
status: done
labels:
- one
- review
- start-chat
priority: 4
parent_id: t-mrj3gtem-ta70
backend: git
sessions:
- ab-mrj3yroh-16323
created_at: 1783940238731
updated_at: 1783943395580
field_marks:
  active_form: 1783940238731
  body: 1783940238731
  claim: 1783940238731
  evidence_summary: 1783940238731
  parent: 1783940238731
  priority: 1783940238731
  recovery_ref: 1783940238731
  status: 1783940238731
  title: 1783940238731
---
CHANGES REQUIRED. HIGH: packages/one/package.json exports one/native-tabs CommonJS require to ./dist/cjs/native-tabs.js, but fresh build/pack emits native-tabs.cjs only. Fresh extracted tarball: require.resolve(one/native-tabs) fails MODULE_NOT_FOUND; require.resolve(one) succeeds. This blocks release.

Everything else is clean: NativeTabs.native.tsx exactly preserves the prior native implementation; ESM/native outputs, maps, declarations, and source pack correctly; fresh web tarball fixture with bottom-tabs 1.4 installed has the explicit unsupported web behavior and no bottom-tabs/codegen references; published 1.20.4 red fixture does include them. Build, typecheck, lint, 2/2 focused tests, 537 pass/56 skip full tests, fixture types/build, and pack dry-run pass. Review only; no edits/commit/push/publish.
