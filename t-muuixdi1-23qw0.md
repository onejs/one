---
id: t-muuixdi1-23qw0
title: Assess and finish approved One browser service parity
status: done
assignees:
- r58956
labels:
- branch:tm/mechanical-native
- lane:spring-one-browser-apis
- umbrella:plans/contrast/cleanup/spring-cleaning.md
backend: git
sessions:
- r58956
commits:
- b185d7f12
created_at: 1791160855705
updated_at: 1791161414225
field_marks:
  active_form: 1791160855705
  body: 1791161414225
  claim: 1791160855705
  evidence_summary: 1791160855705
  parent: 1791160855705
  priority: 1791160855705
  recovery_ref: 1791160855705
  status: 1791161414179
  title: 1791160855705
---
# Browser URL validation parity

Implementation owner r58956; shared branch tm/mechanical-native. Pushed checkpoint b185d7f12ae40ad1575da4eae803cbb35823892c. RAN remote branch matches that exact SHA; v2-beta remains 3d5841af0 pending integration.

READ saved fix/one-unified-browser-apis b996ba954: implementation already landed at 3d5841af0; only completion receipts differ. RAN tm/one-native-api-v2 tip 4d430c48f is an ancestor. Historical tm/one-native-api namespace mapping is superseded by current ./platform root mappings. No branch-wide adoption or new browser feature was needed.

RAN fresh web/native JS probes: web mayLaunchUrl accepted invalid inputs while native synchronously rejected them with no Nitro creation. m20266 approved reusing assertBrowserUrl, shared behavioral regression tests, and supported-browser checks. Changed only web browser entry, existing browser.test.ts and owning plans/one-native-web.md. Valid hints remain false, without a popup. No native/API/auth/export/dependency change.

TESTED baseline web regression fails; native cases pass. Final 172 browser/SSR/docs/effects tests pass. Chromium149.0.7827.55/WebKit26.5 check six invalid inputs synchronously, valid false and no popup, unavailable web auth rejection, and real popup opening with null opener. RAN strict browser-entry TypeScript, focused lint and git diff --check pass. Formatter check reports pre-existing whole-file formatting drift; added test block uses formatter output. No native compile/simulator or physical-device claims.

READ actual Contrast billing and GitHub sign-in Browser callers; open/auth implementations are unchanged. No downstream app runtime or dependency adoption claimed. Contrast's local canary1791109310273 predates saved browser release1791148136111; adoption needs a separately evaluated dependency change.

Git slot granted by r58954 after initial pristine synchronization; explicit path commit/push completed. Its reply explicitly retains whole-range/v2-beta adoption. Delivery task t-muuj8ga1-g0c0 remains open under integration r58954 and CI spring-ci p60445, m20266 fallback. Parent already authorizes narrow v2-beta landing; no extra owner permission needed. Required eventual v2-beta Checks and Tests / Release canary and exact source/dist/releaseSourceCommit verification belong to delivery owners. Preserve superseded-run policy; no CI watcher started here.

Evidence outside shared tree: ~/.team-machine/handoffs/one-browser-r58956/runtime.ts and runtime.json (source hash + commit bound). Result shared directly as share-url-r58956-2a294caab400a040-1a109898f7e-809143c7dec5d936.

Cleanup: runtime closes both browsers and Bun server in finally; listener4817 absent. Proposal wait w-e592 cancelled after approval. No simulations, builders, claims or supervisors owned. Shared tree retained for live successor spring-one-native-blur r58954; its dependency setup and untracked .remote-out trees were preserved. Own tracked changes committed and pushed. No further optimization warranted for one constant-time validation call. Physical sensor/live speech/phone-share/contact/orientation proof remains outside this bounded repair and as recorded in saved browser evidence.
