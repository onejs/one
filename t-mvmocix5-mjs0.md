---
id: t-mvmocix5-mjs0
title: Assess native Windows and Nitro across desktop targets
status: done
active_form: windows probe xaml path diagnosis, plan drafted
owner_status:
  state: landed
  text: plan and spec queued for main; handing to lead
  updated_at: 1792869075020
assignees:
- m57704
labels:
- lane:one-native-desktop
- umbrella:one-native-desktop
backend: git
created_at: 1792863013577
updated_at: 1792869127533
field_marks:
  active_form: 1792867124530
  assigned:m57704: 1792863175590
  body: 1792869095738
  claim: 1792869127533
  claim_current:34e99c6be46071dbabd008aedec7600e: 1792869127533
  claim_state:34e99c6be46071dbabd008aedec7600e:1792869127533:~:~:~:f: 1792869127533
  evidence_summary: 1792863013577
  owner_status: 1792869075020
  parent: 1792863013577
  priority: 1792863013577
  recovery_ref: 1792863013577
  status: 1792869127533
  title: 1792863013577
---
Owner requested one Opus high agent to evaluate the proposed Windows architecture, begin the appropriate Windows work, review shared improvements across Mac/Linux/Windows, and assess the newer Nitro Modules prerelease. Lead s69213 owns integration and independent code review; CI p103700 owns normal workflows. Preserve existing Mac/Linux and Nitro source owners, main/stable holds and no-reset contract. Primary source references: One tm/macos-resume598f29b4fe, tm/one-linux-native d35f3f285d; Nitro registry latest0.37.1 vs alpha-nightly1.0.0-alpha.nightly.100.g107f6fc66597.

One owner-requested Opus high worker confirmed m57704 (windows-native-plan), air-32, managed Contrast plan tree. Launch token lt-7e0a303e77feca5e97cbdf08f7fd8494 recovered lost reply without duplicate launch. Brief covers independent Windows choice/prototype, shared Mac/Linux/Windows improvements, exact Nitro stable vs1.0alpha assessment. Lead69213 owns source/integration review, CI103700 broader delivery.

RAN: windows probe on GitHub windows-2025 (Server 2025 26100, 2 cores EPYC 7763, Hyper-V video, VS 18.11, WinAppSDK 2.5.1 self-contained, CppWinRT 2.0.250303.1). onejs/one branch tm/one-windows-probe (orphan, probe only). run 40117994213 @41273dc527: build 82-100s OK. comp mode (SpriteVisual per view in ContentIsland on DesktopChildSiteBridge/AppWindow) medians of 6-7 warm runs, ms since process creation: first frame 105.5 (0 views), 111.3 (300), 151.8 (3000); dwm flushed 125/138/173; mount 1.0 ms/300, 7.6 ms/3000; ~14-16 KB private per view; app-local WinAppSDK modules 14.9 MB loaded, Microsoft.UI.Xaml.dll not loaded. xaml and xaml-grid: every launch hung until the 60s kill (no result line); diagnosing in run 40121597215 @8812d478bc with per-mark trace and crash capture. payload with full metapackage includes Microsoft.ui.xaml.dll 15.3 MB + Controls 6.9 MB + pri files + WebView2. Timings are relative only: no GPU, 2 cores.

RAN: probe run 40123047723 @f65c17c8f5 (onejs/one tm/one-windows-probe), medians of 7 warm interleaved runs, first frame = composition commit completed, ms since process creation, windows-2025 2 cores no GPU (WARP): comp 300 plain 92.1 / xaml Canvas 136.7; comp 3000 172->134.2 / xaml 209.4; xaml 300 + 25 controls 183.4; xaml-grid (border+radius) 230.3 @300, 947.8 @3000; comp-shape (ShapeVisual rounded+stroke) 150.4 @300, >3.7 s first frame and updates not finished in 30 s @3000. updates: comp 16-17 ms, xaml 3000 27 ms, xaml-grid 3000 418 ms. loaded WinAppSDK modules: comp 14.9 MB, xaml 38.3 MB. full metapackage self-contained payload 185 MB. screenshots confirm every mode drew its tree. earlier run 40122077508 xaml numbers INVALID (Sleep/DwmFlush blocked xaml commit, blank screenshots). evidence: ~/.team-machine/evidence/t-mvmocix5-mjs0-windows-probe/. DECISION in plan: Composition visual per view, WinUI controls in child content islands. Contrast commit c3774165e22 queued in merge train (ticket refs/land-queue/tickets/000000000001792869045808-c377416-9fc033); CI pending, owned by the landing train.

correction to previous entry: comp 3000 plain first frame median is 134.2 ms (the '172->' prefix is a typo).
