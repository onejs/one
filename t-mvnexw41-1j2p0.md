---
id: t-mvnexw41-1j2p0
title: Prove compiled DOM fixture with the real browser runtime
status: done
owner_status:
  state: landed
  text: pushed proof record 424cc44346; real public runtime dev/prod browser seam passes with simulated transport; fixture font filename correction remains s78716-owned
  updated_at: 1792908526684
assignees:
- p111479
labels:
- lane:one-dom
- umbrella:one
parent_id: t-mvnc3bb5-1t20
backend: git
sessions:
- p111479
commits:
- 424cc44346eaf2f207905f2104e9e72066535cf9
created_at: 1792907680465
updated_at: 1792908574501
field_marks:
  active_form: 1792907680465
  body: 1792908526684
  claim: 1792908574501
  claim_current:09baf4e69e1454351b9c696ad158031e: 1792908574501
  claim_state:09baf4e69e1454351b9c696ad158031e:1792908574501:~:~:~:o:d2c5482e527dbac4abf6cdce822632ab: 1792908574501
  claim_state:d2c5482e527dbac4abf6cdce822632ab:1792907770283:=p111479:=mc-h39p4gbj818h:1792907770283:f: 1792907770283
  commit_linked:424cc44346eaf2f207905f2104e9e72066535cf9: 1792908514872
  evidence_summary: 1792907680465
  owner_status: 1792908526684
  parent: 1792907680465
  priority: 1792907680465
  recovery_ref: 1792907680465
  status: 1792908526684
  title: 1792907680465
---
Remaining independent integration proof, reuse original build/browser probes. Exercise real One DOM browser entry/client/hook and actual public built one/dom exports with the focused tests/native-features/fixtures/dom/ProofPage.tsx (or same source used as compiler input), across dev Vite and production ESM output. Original compiler proof stubbed mountDOMComponent, so this closes build/runtime seam. Transport harness may simulate native explicitly; do not claim Fabric/device/Updates. Observe two isolated instances, data/actions/value/void/errors, ref method dependency update, imported image/font/CSS, deferred lazy evaluation, HMR state preservation and actual overlay recovery. Narrow disposable evidence; no new test suite/dependency install/full site or SDK build. Preserve foreign8081 listener; select owned free temporary port, close all owned browser/server handles. Do not edit native/CLI/package/Contrast surfaces; repair demonstrated compiler/browser wiring defect only with source ownership coordination. CI p110356, same Opus independent batch. Feature branch only, no release. Commit/push fixes and finish with external evidence handoff.

# Built DOM compiler/browser/runtime proof

Task t-mvnexw41-1j2p0; worker p111479; lead s78716. Shared pro128 tm/dom-components.
Source baseline 72b352c531cd2102f4937e19d0ad13c449550f68. Proof record commit 424cc44346eaf2f207905f2104e9e72066535cf9 pushed and verified on origin/tm/dom-components. Only owned build README changed; no compiler wiring defect found.

RAN: installed Chromium with actual built One useDOMPlugin, VxRN buildNativeBundle, compiler plugin, public one/dom/client mount and one/dom hook. Both browser specifiers resolved via real package exports to dist/esm/dom/{client,index}.mjs; no browser/runtime aliases. Byte-identical ProofPage.tsx copy plus its browser closure used as compiler input. Native graph had the real component and a DOM default-reexport wrapper behind lazy native import, yielding two HTML entries with shared chunks before deferred native evaluation. Only native createDOMComponent was replaced with a descriptor-only adapter for graph evaluation; no native proxy execution/Fabric claim.

TESTED dev and emitted production ESM, two isolated pages per mode: prop/data reconciliation preserving browser state; actions returning value/void/error; delayed action surviving factory dependency changes; refs read/clear/fail, retained refs seeing latest committed text; isolated input/results/lazy counters; imported SVG/font/CSS; lazy code absent until click, then one evaluation. Dev transitive lazy edit committed via React Refresh without document/input loss. Explicitly importing an intentionally broken lazy module showed Vite overlay; source repair recovered with state/document retained. Reload reset first page state, rejected its old ref and kept second page state. Production scripts/CSS/images/fonts requested only beneath embedded-buildId/one-dom namespace on HTTP server.

Native transport simulated with built DOMNativeBridge via Playwright bindings and an init shim. Zero page errors, bridge error events or transport failures. One expected failed request from intentionally malformed lazy module. No Fabric, custom scheme/intercepted HTTPS, Android WebView, real device, native navigation/layout or Updates activation claim. No install, new test suite, full app/site/SDK build. Reused parent's actual package build outputs; did not rebuild packages.

Fixture issue remains lead-owned: dom-proof.css imports absent ../../assets/OneNativeTestFont-BlockA.ttf. Disposable CSS copy explicitly corrected it to existing OneNativeTestFont-Regular.ttf; shared fixture untouched. Reported once to s78716 with exact seam. Thus original fixture closure is not proven as-is until its owner repairs this path. Component TSX itself was unchanged and hash recorded. No need rerun the whole compiler/browser proof for that exact asset filename correction.

Evidence directory ~/.team-machine/evidence/one-dom-build/real-runtime: probe.ts, probe.log, result.json (built module and fixture hashes, manifest, public resolutions, all checks), fixture/output/one-dom bytes. Three inspected quality90 WebP captures development.webp/overlay.webp/production.webp, each1170x1920 at3x, bytes62428/148400/62650. Earlier probe attempt log preserves the lazy-overlay harness timing correction; final run passed.

All owned browser contexts, dev/static servers closed. Final dev port61827; earlier owned57834/58952/60292 stopped. Foreign8081 PID45568 preserved. No children, resource lock or waits. Shared tree retained for registered lead/native/runtime owners s78716/s78888/p111481; co-tenant Kotlin/Swift and untracked dom-app fixture changes preserved. Same Opus independent batch review and lead integration remain; p110356 owns broad CI. No main/merge/release authority.
