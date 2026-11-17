---
id: t-muyqcs1v-zgg0
title: Prove One.UI.Icon iOS runtime contract
status: done
assignees:
- p67550
labels:
- branch:tm/one-icon-ios-proof
- lane:one-icon-ios-proof
- umbrella:plans/one-native-launch-checklist.md
backend: git
sessions:
- p67550
commits:
- b7000c33b
created_at: 1791415196419
updated_at: 1791416489105
field_marks:
  active_form: 1791415196419
  body: 1791416373214
  claim: 1791415196419
  evidence_summary: 1791415196419
  owner_status: 1791415196419
  parent: 1791415196419
  priority: 1791415196419
  recovery_ref: 1791415196419
  status: 1791416489075
  title: 1791415196419
---
TESTED b7000c33b: strict ui-icon canonical/restored/final suites pass on iPhone17Pro iOS27.0 24A434. Native frames24x24,36x36,48x32,44x28; labels/images, visible decoration, SF ink, semantic danger native reference and explicit green; invalid platform element rejects. Five negative controls: omitted glyph, wrong semantic role, wrong explicit color, original Icon sizing and original accessible Image host reject at exact intended assertions. Evidence/identity/bundles under /Users/n8/Library/Logs/one-icon-ios-proof. Source Icon and generated Controls bound; installed native exe SHA318da9592123f5820a0bb158e4ba31d22b97d0851b043c8484c41519aeb2021e; original native build source not newly authenticated; no rebuild or published canary production acceptance. Focused TS/lint/format/proof guard pass. Package TS blocked by missing @tamagui/web/internal-runtime. Shared generated decorative policy also updates five gradients; separate gradient runtime suites not run; no native-source changes. CI/delivery p67014 owns Checks and Tests, Release/canary tarball and iOS Native Tests. Parent p67085 owns coverage/checklist/docs reconciliation and aggregate runner registration.
