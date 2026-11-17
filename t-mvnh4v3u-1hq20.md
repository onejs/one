---
id: t-mvnh4v3u-1hq20
title: Repair production JSX in DOM browser assets
status: done
owner_status:
  state: landed
  text: pushed branch commit 0df8377003; TESTED production JSX guard fails before/passes after; actual packages/one bun run build exit0 at same SHA; p112072 notified for sole final A/B/C replay. Review s78888/native s78716/CI p110356 remain.
  updated_at: 1792912396839
assignees:
- p112283
labels:
- lane:one-dom
- umbrella:one
parent_id: t-mvnc3bb5-1t20
backend: git
sessions:
- p112283
commits:
- 0df837700331e34b4bed7a83f733faca421a251a
created_at: 1792911364986
updated_at: 1792912562438
field_marks:
  active_form: 1792911364986
  assigned:p112283: 1792911548782
  body: 1792912396839
  claim: 1792912562438
  claim_current:204e44da8a58760689edff4c4ea8ac73: 1792912562438
  claim_state:204e44da8a58760689edff4c4ea8ac73:1792912562438:~:~:~:o:9a33d30a5332c3be943401eeb17a9077: 1792912562438
  claim_state:9a33d30a5332c3be943401eeb17a9077:1792911507992:=p112283:=mc-h39p4gbj818h:1792911507992:f: 1792911507992
  commit_linked:0df837700331e34b4bed7a83f733faca421a251a: 1792912161030
  evidence_summary: 1792911364986
  owner_status: 1792912396839
  parent: 1792911364986
  priority: 1792911364986
  recovery_ref: 1792911364986
  status: 1792912396839
  title: 1792911364986
---
Lead started by reading actual failure envelope ~/.team-machine/evidence/one-dom-updates/driver/browser-failure.json and packages/one/src/vite/dom/browser.ts. Actual final production page calls jsxDEV with production runtime; buildDOMAssets forwards resolved config.oxc.jsx and disables refresh but not inherited development mode. Own browser build/config seam and focused existing integration guard only; repair cause and prove actual production emitted page with JSX executes under NODE_ENV=production. Coordinate built One prerequisite and actual artifact replay with p112072; no native/fixture/runtime/packager edits. Original build author p111479 continuation preferred, occupies existing second Sol slot. Shared managed pro128 tree tm/dom-components. REVIEW same s78888; CI p110356 owns broader delivery. No release/reset/install/full builds; preserve co-tenants.

Respawn requestlt-28ceb3cb797ed277158c8fa46fee40b3 RAN successor p112283 launched, custody unsettled; no retry/newworker. Successor instructed to adopt canonicaltree so exactrequestcan settle. Originalp111479 alreadyexited priorfinish; sourceauthorship/context retained. No accountoverride/credits.

RAN successor p112283 adopt exit0, tree wt_ca22ae32525d3c76cb38ff91 ownership_version7 attached p112283 and p112283@pro128; task claimed. Exact respawn request lt-28ceb3cb797ed277158c8fa46fee40b3 settled exit0 from primary CLI: p111479 -> p112283, nothing launched/stopped. Original build author continuation secured, no unknown launch/custody remains.

# Production JSX repair

Task t-mvnh4v3u-1hq20; author p112283, successor to p111479. Lead s78716.
Shared tree /Users/n8/.worktrees/one-dom-components, branch tm/dom-components.
Lane base 9232b50183920fe9ccbd98ba1cd48f9060709bc5; this repair starts at fb1efbe59e.
Ordered repair commits: 0df837700331e34b4bed7a83f733faca421a251a, pushed and remote verified.

RAN source inspection: buildDOMAssets forwarded resolved oxc.jsx.development:true
to a production browser build. TESTED existing build integration guard reproduced
the exact jsxDEV-is-not-a-function failure with production React runtime.
Fix disables JSX development transforms alongside Refresh while preserving
configured JSX runtime/importSource. README corrects the earlier proof limitation.

TESTED guard after repair: 1 passed. It executes both emitted JSX ESM entries
in Node with NODE_ENV=production, invokes real React JSX, verifies expected
element/asset identity, and checks browser lazy module evaluation stays deferred.
Existing native graph isolation, lazy entry discovery, deterministic assets,
asset completion join and stale-output removal checks also passed.
This uses a descriptor-only native adapter and mount adapter, not native proof.
Evidence production-jsx-before.log and production-jsx-after.log in this directory.

RAN exactly one actual packages/one bun run build under normal admission: exit0,
2026-10-25T07:11:15.655773Z through 07:11:49.504447Z; source SHA unchanged at
0df837700331e34b4bed7a83f733faca421a251a. Source/dist hashes and exact receipt:
production-jsx-package-build.json; build log production-jsx-package-build.log.
Both ESM and CJS dist contain development:false. Runtime631b297796 is an ancestor.

Required next delivery: p112072, sole artifact producer, has the exact repair/build
receipt by authorized seam message and owns fresh repaired/run-all.mjs A/B/C
generation plus actual emitted-page browser replay. Original driver artifacts
and browser-failure.json remain untouched. No new artifact set produced here.
s78716 owns native app integration and native/Updates proof. No Fabric, device,
WebView origin, update activation or rollback claim. s78888 owns independent
batch review when account resumes; p110356 owns broad CI. No new reviewer,
release or main merge. No waits or builds remain owned by this session.

Tree is clean, retained for registered holders s78716 and p112072 plus native
build helper p112291; do not remove it. Installed package build output is required
by the sole producer. This author stops its staleness watcher and releases only
its own session hold through finish. No app server or listener was started.
