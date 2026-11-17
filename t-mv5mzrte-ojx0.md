---
id: t-mv5mzrte-ojx0
title: Fix symlinked native route registry imports
status: done
owner_status:
  state: landed
  text: v2-beta f56a8ac668, 113 tests, actual Contrast HTTP200, verified canary 1791834110990
  updated_at: 1791835157798
assignees:
- s35703
labels:
- branch:tm/owned-app-routes
- lane:owned-app-routes
backend: git
created_at: 1791832813970
updated_at: 1791835157850
field_marks:
  active_form: 1791832813970
  body: 1791835157850
  claim: 1791832813970
  evidence_summary: 1791832813970
  owner_status: 1791835157850
  parent: 1791832813970
  priority: 1791832813970
  recovery_ref: 1791832813970
  status: 1791835157798
  title: 1791832813970
---
Parent t-mv5me56p-prz0 belongs to Contrast task lane and cannot be linked here. Source owner createNativeDevEngine.ts; clean base origin/v2-beta 8ae6897c4e. Reproduce symlink failure, preserve route/HMR behavior, push v2-beta. Upstream artifact owner s35703; Contrast CI r68679.

RAN tiny One dev app packages/shell with ../../node_modules symlink returns HTTP500 with unresolved ../../app imports. Focused regression passes load, self-accepted edit, dynamic [id] creation/loading and deletion using real Rolldown HMR. Fix realpaths cache directory before computing relative imports. Local release --into isolated /tmp/one-owned-routes-proof in progress.

TESTED: two complete native engine suites passed, 113 checks. Each edit/create/delete regression uses a fresh symlinked app. Commit f56a8ac668. Initial local release consumer linked excess workspace packages; stopped owned build and narrowed consumer to One family. Re-running full release --into; skip-build artifacts are not validation evidence.

Upstream source f56a8ac668ff585247ed9f13937a93f600c7b5a7. Release https://github.com/onejs/one/actions/runs/38297515783 pending at snapshot; Checks and Tests 38297515950 in progress. Source and baseline evidence preserved at studio-64:/tmp/one-owned-routes-artifacts. Upstream artifact owner remains s35703; Contrast CI r68679. Worktree retained while build and packed tarball proof are incomplete.

RAN bun release --into /tmp/one-owned-routes-proof completed full family build and installed 16 packages. Tiny One dev symlink app HTTP 200, 6672265 bytes (baseline HTTP500). Exact locally built family tarballs: studio-64:/tmp/one-owned-routes-artifacts/local-tarballs/manifest.json, source f56a8ac668ff585247ed9f13937a93f600c7b5a7. All 16 packed manifests carry releaseSourceCommit and contain no workspace specs; packed vxrn dist inspected for realpathSync(dirname(registryPath)) and relative(registryDir,file). Parent can install these artifacts without root manifest or lock changes while canary is pending. Owned dev server stopped.

Cleanup: owned dev server stopped, isolated proof consumer removed after preserving fixture and evidence. tm worktree remove reports held only by this session own PIDs; released on session exit. Retained tree live owner s35703 until canary evidence closes. Durable receipt /tmp/one-owned-routes-artifacts/receipt.txt, tarball manifest /tmp/one-owned-routes-artifacts/local-tarballs/manifest.json.

Parent requested actual downstream release due missing @swc/core. RAN normal bun release --into actual Contrast worktree --skip-build completed 17 package installs using retained exact outputs. RAN @swc/core still missing afterward; release script only adds internal workspace dependencies. Installed declared SWC 1.16.18 and its external dependency closure under node_modules/@vxrn/compiler/node_modules, preserving root files. RAN downstream stripFlowTypes compiled typed Flow export successfully. Exact external tarballs preserved under compiler-dependency-tarballs/manifest.json. Actual shell HTTP probe in progress; canary watcher canceled while resolving this blocker.

RAN actual Contrast shell one dev: HTTP200, 8496810-byte iOS bundle after local release plus missing SWC external dependencies installed package-locally. Root manifest and lock SHA256 hashes unchanged. Owned port4937 server stopped. Exact source and local/external artifact receipts ready at studio-64:/tmp/one-owned-routes-artifacts/receipt.txt.

RAN Release 38297515783 succeeded. Exact npm one/vxrn 2.0.0-0.canary.1791834110990 tarballs identify source f56a8ac668ff585247ed9f13937a93f600c7b5a7; packed vxrn dist fix verified. Canary tarballs+SHA256s preserved at studio-64:/tmp/one-owned-routes-artifacts/canary-tarballs/manifest.json. Receipt and handoff in artifact directory. Actual Contrast remains on validated local source release; canary inspected only. Contrast CI owner r68679; no pending upstream artifact work.
