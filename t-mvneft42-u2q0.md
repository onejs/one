---
id: t-mvneft42-u2q0
title: Finish Linux M3 native controls
status: done
active_form: TESTED four controls, theme measurement, Slider completion/reset and progress modes. Finishing tagged selection and ScrollView proof. Builds passed in stages. s72425 and ci-manager own broader delivery.
owner_status:
  state: needs
  text: TESTED M3 source and arm64 release VM proof pushed at dba04ff088. s72425 and ci-manager own independent review, full release isolation and broader platform builds. VM and owned services stopped.
  updated_at: 1792909533168
assignees:
- s79514
labels:
- lane:one-startup
- umbrella:one-linux
parent_id: t-mvnatphy-1rvk0
backend: git
sessions:
- s79514
commits:
- 099d36c837dbbf1f121c641803361f5b4f74a8ac
- 0b84b02805629df5ac33cddea9bffd65c10b3a28
- 91d0145292e61702966fa78c0f664b98b55aec44
- 968b82032f2740220acb81cec0ad742f1e628fd9
- c43c6fc7cc93a0c011de063b3097bad0cf7e5541
- dba04ff0885137d45330e441ea10c9318ec1b2e8
- fe617e04901adce936ab66ff3e800e57e3cd4542
created_at: 1792906836770
updated_at: 1792909533168
field_marks:
  active_form: 1792909182758
  body: 1792909533168
  claim: 1792906836770
  commit_linked:099d36c837dbbf1f121c641803361f5b4f74a8ac: 1792907527214
  commit_linked:0b84b02805629df5ac33cddea9bffd65c10b3a28: 1792907527304
  commit_linked:91d0145292e61702966fa78c0f664b98b55aec44: 1792909518076
  commit_linked:968b82032f2740220acb81cec0ad742f1e628fd9: 1792909518012
  commit_linked:c43c6fc7cc93a0c011de063b3097bad0cf7e5541: 1792909518142
  commit_linked:dba04ff0885137d45330e441ea10c9318ec1b2e8: 1792909518197
  commit_linked:fe617e04901adce936ab66ff3e800e57e3cd4542: 1792907527362
  evidence_summary: 1792906836770
  owner_status: 1792909533168
  parent: 1792906836770
  priority: 1792906836770
  recovery_ref: 1792906836770
  status: 1792909533168
  title: 1792906836770
---
Assigned by s72425: add four counterparts to existing One native controls, close intrinsic sizing, Slider completion, indeterminate progress and dropdown item gaps, then capture RN ScrollView composition. Push tm/one-linux-native only. No tests, PR, main push or RN patch. CI owner ci-manager via s72425.

RAN: release host incremental builds, One JS/declarations plus static-spec/SDK stages, Linux bundle and Hermes compile, focused lint 24 files (0 warnings/errors), package lint (0 errors, 8 existing warnings), real uinput and 13 WebP captures. TESTED four new controls accept/reject/revision reset/Enter/masking, theme/font bounds, pointer and keyboard Slider completion with silent reset, progress activity/determinate modes, duplicate-label tagged selection/reorder/reject/clear and indexed selection, interactive RN ScrollView composition. Detailed evidence is in plans/one-linux-native.md. Combined package command hit external-volume EPERM; its individual build stages passed. No tests, RN patch, PR, main push or release. Retain clean worktree for registered lead s72425. Remaining source-only Slider touch/wheel/focus paths and full x86_64/platform bundle checks are documented.
