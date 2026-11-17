---
id: t-mv7isfob-7yg0
title: Keep GLB test fixtures outside published package tree
status: done
owner_status:
  state: landed
  text: Packing repair862 merged1bb06d5374; exact main Checks+Android+website deploy allSUCCESS.
  updated_at: 1791951102799
assignees:
- r91521
labels:
- branch:tm/pack-fixture-race
- lane:one-pack-fixture-race
- umbrella:one-ci-owner
parent_id: t-mv7h2lol-13lv0
backend: git
created_at: 1791946685531
updated_at: 1791951102867
field_marks:
  active_form: 1791946685531
  assigned:r91521: 1791946763621
  body: 1791951102867
  claim: 1791946685531
  evidence_summary: 1791946685531
  owner_status: 1791951102867
  parent: 1791946685531
  priority: 1791946685531
  recovery_ref: 1791946685531
  status: 1791951102799
  title: 1791946685531
---
RAN PR860 required job38501296120/job115648631802 fails packedClosure: bun pm pack ENOENT vxrn src/config/.glb-web-PI4Zm9/entry.js. Source glbAssets.test.ts creates web and dev fixture dirs beneath import.meta.dirname; vxrn files includes src. INFERRED concurrent fixture cleanup overlaps pack enumeration. Fix cause by isolating fixtures outside package tree; preserve GLB byte/type/import/emission assertions, no pack/test retries or changed timeout. CI owner s37966; REVIEW none. Maintenance changes no runtime bytes; no library release required.

RAN fixture-race fix pushed as PR862 (branch tm/pack-fixture-race, SHA e1a49d120, base origin/main 6908e5316), tests-only change to packages/vxrn/src/config/glbAssets.test.ts: web+dev fixtures moved to tmpdir, web stubs for getBaseViteConfig root resolution, dev middleware run from fixture root with relative(root,file) request. RAN glbAssets.test.ts 4 passed; RAN packedClosure manifest 1 passed; RAN 3x concurrent GLB+pack 0 hits 651 files; RAN baseline held-src-fixture pack contaminated (2 files sha256 match) and post-fix held-tmpdir pack clean. Evidence ~/.team-machine/results/one-pack-fixture-race-evidence/. Result ~/.team-machine/results/one-pack-fixture-race.md. CI owner s37966; REVIEW none.

RAN parent inspected one-file diff. REPORTED worker held old GLB fixtures packed with byte match, repaired4GLB tests/packmanifest1test/3 concurrency probes pass; heavy Metro closure awaits hosted workflow. Existing goals.md CI speed row3 covers maintaining green CI. PR860 approval/auto-merge already enabled per source owner; PR862 requires separate main approval. No stable publishing for maintenance.

RAN w-9c438d verified exacte1a49d120eb1d382a1a40bddd70a4d7e62337161: Checks and Tests38504384045 SUCCESS and Android Native Build38504384033 SUCCESS. Hosted test gate now includes previously failing packedClosure Metro integration, so local heavy-probe limit is covered by CI. No main merge without pending direct Nate approval.

RAN verified inbox answer Merge PR862 after checks; all exact e1a49d120 source gates SUCCESS. Squash merge completed03:53:31Z at1bb06d5374cbf56cb15d73eca09dcea1b9b42ca9. Tests-only maintenance; no stable publication or dispatch. Keep delivery open through covering main validation.

RAN w-761f73 verifies exact1bb06d5374cbf56cb15d73eca09dcea1b9b42ca9 Checks and Tests38508580534 SUCCESS, Android Native Build38508580437 SUCCESS, Deploy website38508580476 SUCCESS. Hosted regression gate and production deploy passed. Tests-only repair delivery complete; native feature acceptance tracked separately.
