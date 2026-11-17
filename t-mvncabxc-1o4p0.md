---
id: t-mvncabxc-1o4p0
title: Build approved One DOM directive and browser graph integration
status: done
owner_status:
  state: landed
  text: build slice committed and pushed on feature branch; focused checks pass; lead owns Opus review and native integration
  updated_at: 1792904906856
labels:
- lane:one-use-dom
- umbrella:one
parent_id: t-mvnc3bb5-1t20
backend: git
sessions:
- p111479
commits:
- 9be2e8b1939f824812d8d979e4146c26e5d5cafa
created_at: 1792903221984
updated_at: 1792904950186
field_marks:
  active_form: 1792903221984
  body: 1792904906856
  claim: 1792904950186
  claim_current:8e40ceaaed428edb0c43e70cf9e08c0a: 1792904950186
  claim_state:19676429b16bce66a629056534c3a09a:1792903277964:=p111479:=mc-h39p4gbj818h:1792903277964:f: 1792903277964
  claim_state:8e40ceaaed428edb0c43e70cf9e08c0a:1792904950186:~:~:~:o:19676429b16bce66a629056534c3a09a: 1792904950186
  commit_linked:9be2e8b1939f824812d8d979e4146c26e5d5cafa: 1792904816462
  evidence_summary: 1792903221984
  owner_status: 1792904906856
  parent: 1792903221984
  priority: 1792903221984
  recovery_ref: 1792903221984
  status: 1792904906856
  title: 1792903221984
---
Build slice for approved One DOM design. Native proxy substitution, actual native graph discovery including lazy entries, Vite dev/browser multi-entry ESM output, stable descriptor registry and packaging join. Exact ownership/contract in launch brief. Shared pro128 managed tree one-dom-components. No native host, runtime bridge or package exports edits. REVIEW: Opus s78888 after account resumes; Sol lead s78716 integrates, CI p110356 owns broad checks.

RAN focused source-native bundler probe: production buildNativeBundle emitted 2 DOM pages including a boundary behind a lazy native import; native dependency resolver trap recorded zero browser/CSS/asset requests. TESTED VM execution: lazy native side effect absent before import and exactly once after. Production Vite multi-entry ESM emitted shared ReactDOM/CSS/image and a separate browser dynamic chunk. Browser execution/refresh, registry invalidation and deterministic repeated output are next. Evidence /Users/n8/.team-machine/evidence/one-dom-build/probe.ts and probe.log. Built JS/third-party dependencies copy-on-write hydrated only into retained shared tree; no primary writes.

Implemented and pushed build slice commit 9be2e8b193 on tm/dom-components (parent runtime 3d7d61fbcd; base 9232b50183). TESTED One typecheck, focused lint (0 warnings/errors), 6 focused tests across DOM build integration and native plugin registration. TESTED source-native production isolation/lazy discovery/deferred execution, actual createNativeDevEngine directive add/remove/add, and Chromium dev + emitted-production ESM with shared chunks/CSS/font/image, deferred browser side effect, transitive React Refresh retaining document, overlay failure/recovery, SSR original rendering, prologue/export/route/server diagnostics, and checkout/symlink/same-basename IDs. Integration guard also proves deterministic buildId, changed bytes changing buildId without descriptor changes, no unrelated public copy, stale output removal. Native device origins/ESM/bridge/Updates remain UNPROVEN and owned by s78716/s78888; no native support or performance claim. Manifest contract {protocolVersion:1,buildId:<output sha256>,entries:{id:relativeHTML}}. Browser publicDir/copyPublicDir false; root-relative public assets unsupported, documented. Metro receives config diagnostic; no Metro transformer changed. Proof/evidence /Users/n8/.team-machine/evidence/one-dom-build; six logs plus browser-result.json and 3x WebP screenshots. CI p110356 owns broad checks; Opus s78888 owns independent batch review; no release/minor inclusion authority. Shared tree retained by registered s78716/s78888; co-tenant uncommitted native/fixture changes preserved.

Handoff finalized at /Users/n8/.team-machine/evidence/one-dom-build/handoff.md (3598 bytes). Remote refs/heads/tm/dom-components verified 9be2e8b1939f824812d8d979e4146c26e5d5cafa. Authored paths clean; shared tree retained with registered s78716/s78888. Owned probe listener 62078 stopped; exact port check found none. No waiting build prerequisites remain.
