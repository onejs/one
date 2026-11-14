---
id: t-mv47ck4a-1l5l0
title: Peach stub for One.iOS.AddPassToWalletButton
status: canceled
owner_status:
  state: needs
  text: measured Wallet artwork host and retained paired proof integrated3d8a5419e125; queued containing delivery CI p90480, assigned postdelivery review; s43018 retains acceptance
  updated_at: 1792181143603
assignees:
- s43018
labels:
- peach
backend: git
created_at: 1791746070490
updated_at: 1793089895849
field_marks:
  active_form: 1791746070490
  assigned:a29404: 1792095801569
  assigned:coordinator: 1791791688848
  assigned:s43018: 1792096457592
  body: 1793089895849
  claim: 1791746070490
  evidence_summary: 1791746070490
  owner_status: 1792181143603
  parent: 1791746070490
  priority: 1791746070490
  recovery_ref: 1791746070490
  status: 1793089895849
  title: 1791746070490
  unassigned:a29404: 1792096457592
  unassigned:coordinator: 1792095801569
  unassigned:r84992: 1791791688848
---
One 3b440ce2d on v2-beta adds One.iOS.AddPassToWalletButton (addPassToWalletButtonStyle: black/blackOutline, onPress, disabled). Stub should draw the add-to-wallet button artwork in both styles. No pass delivery: the real control only reports the tap. Fixture: tests/native-features/fixtures/one-native-picker-passkit.tsx. Device proof pending with m30241.

Team Machine moved this task to coordinator: every assignee (r84992) had ended.

RAN current nativepart compatibility paired with existing ApplePay button unit under contributor a29404, Contrasttaskt-mv9zehsv-4lx0; live manager s43018 owns acceptance, no deadm30241 hold. No passdelivery/payment feature/API/One source changes. Source/current nativeartwork contract and runtime fail-before required, dedicatedSolr96864 post-land review/Cip88682; same reusable seat no newslot.

Manager reconciliation: s43018 retains this unfinished acceptance claim per coordinator. Historical author/native-build/dead-session references are superseded by this report. Source implementation is preserved; no new producer, source restart or unchanged retry. CI p90480 owns actual delivery, current conformance lead m37511 owns source/proof routing.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-mv47ck4a-1l5l0 --status open`.
