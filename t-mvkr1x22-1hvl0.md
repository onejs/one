---
id: t-mvkr1x22-1hvl0
title: Center macOS text within explicit line height
status: done
assignees:
- s69527
labels:
- lane:one-macos
- umbrella:one-macos-native
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69527
commits:
- 9ce9e088bbf57a02d18f794c15b96a0ac6311673
created_at: 1792746625178
updated_at: 1792748193390
field_marks:
  active_form: 1792746625178
  body: 1792747804499
  claim: 1792748193390
  claim_current:85e90a09c253c6b9ad0cdc6693bc0183: 1792748193390
  claim_state:598fde06fc5da66998343e4dc7bc0e9b:1792747020506:=s69527:=mc-3aa87nk0z4j17:1792747020506:f: 1792747020506
  claim_state:85e90a09c253c6b9ad0cdc6693bc0183:1792748193390:~:~:~:o:598fde06fc5da66998343e4dc7bc0e9b: 1792748193390
  commit_linked:9ce9e088bbf57a02d18f794c15b96a0ac6311673: 1792747557522
  evidence_summary: 1792746625178
  owner_status: 1792746625178
  parent: 1792746625178
  priority: 1792746625178
  recovery_ref: 1792746625178
  status: 1792747557713
  title: 1792746625178
---
Consumer s69465 captured title/summary baseline misalignment at /Volumes/Samsung-1TB-990/evidence/one-macos-live-flow/row-crop-s13.png. Lead source confirms OneMacosText.mm sets fixed line-height minimum/maximum without baseline offset; installed RN iOS centers extra leading using a baseline offset. Cause is INFERRED until native equal-font Text lineHeight16/20 centered-row probe. Same native text owner s69527 should repair at current semantic-color checkpoint, reuse native fixture/build, prove before/after and ordinary/multiline behavior. No consumer shim, broad matrix or automated UI tests. Lead owns consumer proof; ci-manager owns branch workflows.

Independent Sol lead review of e2d5d275be and9ce9e088bb: APPROVED for branch integration, final One owner review still holds. Read macOS color/text diff, owning plan/README, exact provenance and original native-density before/after captures. Ran disposable Objective-C++ probe against actual HostPlatformColor.mm: exact numeric ARGB, aliases equality/hash, missing/invalid name rejection, known semantic clear distinct from miss, light/dark packed color change, stable hash and unordered_set lookup across drawing appearances all pass. Probe /Users/n8/.team-machine/evidence/one-macos-resume-s69213/color-review.mm and .log. Original lineheight captures show aligned row and before/after multiline frame220x41 unchanged. No blocking finding; high contrast/live accent/consumer proof remain unexercised here.
