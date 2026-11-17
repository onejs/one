---
id: t-mvkp8e9y-tkl0
title: Add native Mac buttons and segmented controls
status: done
owner_status:
  state: landed
  text: 478f390923 on origin/tm/macos-controls; native fixture validated; lead owns integration/review
  updated_at: 1792745540835
labels:
- lane:one-macos-controls
- umbrella:one-macos-native
priority: 3
parent_id: t-mvknc99k-k8t0
backend: git
sessions:
- s69441
commits:
- 478f3909233c54f6a3cafca70ac43c130cecc4eb
created_at: 1792743568198
updated_at: 1792745736954
field_marks:
  active_form: 1792743568198
  body: 1792745609984
  claim: 1792745736954
  claim_current:b35918555b00307e74d04d2d9867c0d9: 1792745736954
  claim_state:391c61ac20c470f1e7ae41a941c1efb1:1792743631103:=s69441:=mc-3aa87nk0z4j17:1792743631103:f: 1792743631103
  ? claim_state:5360f0e0f2d6f28b0306bf8103f8efcd:1792743658335:=s69441:=mc-3aa87nk0z4j17:1792743658335:o:391c61ac20c470f1e7ae41a941c1efb1
  : 1792743658335
  claim_state:b35918555b00307e74d04d2d9867c0d9:1792745736954:~:~:~:o:5360f0e0f2d6f28b0306bf8103f8efcd: 1792745736954
  commit_linked:478f3909233c54f6a3cafca70ac43c130cecc4eb: 1792745540668
  evidence_summary: 1792743568198
  owner_status: 1792745540835
  parent: 1792743568198
  priority: 1792743568198
  recovery_ref: 1792743568198
  status: 1792745540835
  title: 1792743568198
---
Owner directly requested incredibly native UI throughout and integrated Mac window. Consumer source origin/tm/one-macos-native-ui e48947c09 batch4 asks19: actual NSButton and NSSegmentedControl rather than painted Pressables for pane actions and feed filters. Reuse One V2/Fabric/controlled-value pattern. Implement focused native components in One.macOS on feature branch, use real AppKit controls, validate press/select/controlled update/disabled/teardown and inactive-window AX without focus theft. Independent native build/cache from live Networking author s69303; no edits to Networking/Blob/Modules registration. Lead owns integration and consumer wiring; no One main merge or stable release. Review by independent Opus after bounded unit.

Implemented real NSButton and NSSegmentedControl with Fabric descriptors, AppKit Swift hosting, native AX children, and existing OneNativeControlled/useControlled protocol. Fast-forwarded exact a30893b0ed base cleanly. Separate derived data at /Volumes/Samsung-1TB-990/builders/one-macos-controls; core compile succeeded, app build and manual fixture checks in progress. Public API and manual proof recipe documented. JS output built using existing tamagui-build --skip-types; full declaration emit hit pre-existing Babel type incompatibility in unrelated files.

RAN: initial fixture falsified generic native event names: topPress conflicts with RN bubbling registry. Repaired cause with specific direct events buttonPress and selectedIndexChange, retaining public onPress/onChange. Rebuilding exact affected native target before proof.

TESTED: native Debug app build, Swift typecheck, static JS configs; interprocess CuaDriver AX button press and segmented selection; React external update with no change echo; rejected selection converges; disabled button rejects and disabled segment AXPress changes neither state nor counters; state retained across unmount/remount; post-reload controls emit once. Native bitmap captures inspected, cursor 900,373 unchanged, appActive/windowKey false. Evidence /Volumes/Samsung-1TB-990/evidence/one-macos-controls includes native-controls.webp, disabled.webp, provenance.json and manual AX readbacks. Own commit 478f390923 based on a30893b0ed. CI owner ci-manager owns normal branch workflows; no watcher started for downstream delivery. Lead s69213 owns consumer wiring and crossmodel review. No main merge or release.

Closeout: clean tree and exact remote tip verified. Owned fixture/server/esbuild stopped; no listener remains on8098. tm worktree remove returned kept only for this session own process holders; release on exit. Handoff /Volumes/Samsung-1TB-990/evidence/one-macos-controls/handoff.md under4KB. Independent derived data/app copy retained for lead s69213 review and repro. All public changes are pushed; review/integration remain with lead.
