---
id: t-mv267vaf-ftj0
title: Re-verify One v2 docs snippet gate and native reference tests on current v2-beta HEAD
status: done
labels:
- lane:one-v2
backend: git
created_at: 1791623239719
updated_at: 1791623390691
field_marks:
  active_form: 1791623239719
  body: 1791623390691
  claim: 1791623239719
  evidence_summary: 1791623239719
  owner_status: 1791623239719
  parent: 1791623239719
  priority: 1791623239719
  recovery_ref: 1791623239719
  status: 1791623390646
  title: 1791623239719
---
RAN HEAD 215624cc9: check:snippets 553 snippets/39 unparsed illustrative/0 API errors; packages/one/tests/nativeDocs.test.ts 142 pass 0 fail; bogus One.Widgets.noSuchMethod_xyz probe rejected TS2339 with gate exit 1 then removed and gate clean again; src diff since declaration regen d79107e7a is runtime-body-only with unchanged exported signatures; androidPlatformLimits.test.ts 2/2 pass under vitest (bun test is the wrong runner for this package); every recent feature commit carried its docs page, no new page lacks nav. No doc fix needed, no commit pushed. Full bun run build still fails on pre-existing TS2307 @tamagui/web/internal-runtime, Tamagui-side and out of lane.
