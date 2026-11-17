---
id: t-mvmw37o0-7md0
title: Prove a WinUI control island in the Windows Composition host
status: done
owner_status:
  state: landed
  text: bounded prototype reviewed and accepted; pushed source retained, no main merge
  updated_at: 1792883291640
assignees:
- s69213
labels:
- one-native-desktop
- umbrella:one-native
- windows
parent_id: t-mvmocix5-mjs0
backend: git
sessions:
- p110367
commits:
- aa0a6b71c37f28210a5223d606cf5ac9f1c2f130
created_at: 1792876016016
updated_at: 1792883291640
field_marks:
  active_form: 1792876016016
  body: 1792883291640
  claim: 1792876016016
  commit_linked:aa0a6b71c37f28210a5223d606cf5ac9f1c2f130: 1792883086037
  evidence_summary: 1792876016016
  owner_status: 1792883291640
  parent: 1792876016016
  priority: 1792876016016
  recovery_ref: 1792876016016
  status: 1792883291640
  title: 1792876016016
---
Continue the owner-requested Windows lane with its next unresolved architecture premise: an actual Composition window hosting a WinUI control as a child content island, using the shared One runtime. Reuse reviewed Windows M0 source tm/windows-core-review 5c0a634df8 and pinned Linux native-core d35f3f285dde without copying/patching its runtime. Prove actual native input reaches Hermes and causes a subsequent Fabric mount that visibly updates the scene/control. Record whether real React is used; manual Fabric JS cannot establish full planned M1. Include resize, one focus transition and close/unmount behavior, screenshots and exact source/binary/runtime provenance on the existing free Windows runner. This is a bounded architecture prototype, not Windows platform resolver plumbing, production APIs, a full app/port, Nitro migration, timing target or release. Lead69213 reviews; CI103700 broader checks. Single OpusHIGH Windows slot, replacing completed M0 correction author. Owner original words and engineering-plan distinction in Contrast spec/plan one-windows-native.md and lead windows-nitro/scope-audit.md.

Lead started architecture slice by reading the original UI probe and current Microsoft XamlIsland/ChildSiteLink documentation. Existing probe did not host a WinUI child in Composition. M0 source5c0a634df8 independently accepted, no new full rebuild needed. Sole OpusHIGH window-island launch is pending canonical lt-630acbead73d67c593b651bed8427579 on pro128; not confirmed working until receipt. No duplicate launch, source ownership stays Windows-only. Exact task brief in lead windows-nitro/window-island-brief.md.

Canonical pending launch resolved by actual host launch-attempt record state started: p110367. Same sole Windows slot, no duplicate. Source receipt requires compliant home cwd and OpusHIGH; parent retains review and one reply wait. Prior launch preparation stdout timed out without failure, so its token was resolved rather than relaunched.

p110367 result. TESTED on run 40140133384 (source 26a4bfd591, README aa0a6b71c3, branch tm/windows-window-island): all 48 driver checks pass, host exits 0. A WinUI ToggleSwitch in a XamlIsland is connected through ChildSiteLink into a Windows App SDK 2.5.1 composition window (no DesktopWindowXamlSource, no overlay HWND, no XAML tree for other views). Real React 19.3.0 bundled by Metro 0.87.1 for platform ios (Platform.OS reads ios; no Windows resolver) runs on the shared OneHostRuntime from native-core d35f3f285dde read only. SendInput click and Space toggle the native switch, React receives onIsOnChange, and the next Fabric transaction mounts the new label, square and bar color; acknowledgement 2 to 4 ms after input. Focus: Tab departs the island via DepartFocusRequested, Space then reaches only the parent, Tab returns via NavigateFocus(First) with keyboard focus; React tracks each. Resize relayouts and moves the link; click lands. Unmount closes the island, remount opens a new one with React state and takes input. Close: empty tree removes 10 views, closes the island, then the runtime is destroyed. Finding fixed in adb1872882: SurfaceHandler::stop commits the empty tree then destroys the shadow tree, whose destructor revokes the MountingCoordinator, so a posted pull found nothing (RAN, run 40138524540 trace); the runtime now mounts UI thread commits synchronously as iOS does. ContentPreTranslateMessage is absent from 2.5.1 metadata; RunEventLoop handles island keyboard input. Runner screen 1024x768 at 96 dpi, so captures are 1x. Evidence (10 screenshots, trace, drive.txt, hashes, versions, bundle): /Users/n8/.team-machine/evidence/windows-window-island-40140133384, earlier passing run 40139325069 beside it. Not claimed: M1 acceptance, a Windows platform resolver, timing targets, bit-identical rebuilds (the runtime DLL hash differs between runs with identical runtime source).

# Windows control island lead review

Verdict: APPROVE the bounded architecture experiment. This is not production Windows support or authority to merge a new feature to main.

Source: tm/windows-window-island aa0a6b71c37f28210a5223d606cf5ac9f1c2f130, remote verified. Actual run40140133384 used26a4bfd5918afbf736d13fa803f4aba26275dd2b; only README changes between that source and the final head. Original M0 and script repair authors remain in the merge history. The apparent iOS diff against5c0 is inherited main9232, not this author's Windows edits. The worker has exited, and its managed tree was automatically removed after clean/pushed completion. Source objects and durable remote evidence remain on pro128.

RAN: read the Windows runtime, shared queue, app, host, driver, workflow and project boundary. XamlIsland.ContentIsland connects through ChildSiteLink to a placement visual in the Composition tree. DesktopChildSiteBridge is the parent window bridge; there is no DesktopWindowXamlSource or per-control overlay HWND. Real React useState drives the switch label, bar and new squares through native events and Fabric transactions. It uses shared OneHostRuntime d35f3f285dde, without modifying or copying that foundation.

RAN: read the author's48 passing actual-input checks, versions and lifecycle trace. Independently inspected native screenshots and checked pixels to challenge the claim that only log text changed: the initial bar has35840 gray pixels and no green, the click capture has36416 green pixels, and the remounted final capture has two exact24x24 green squares and two red ones. The final label says four changes, switch2. Review check output is island-review/review-capture-check.json. No parent Windows execution or fresh build is claimed.

RAN: read the earlier failed teardown trace40138524540. It says no transaction to pull, then10 views and1 island remain. Final source mounts UI-thread commits synchronously; the final trace closes the island before runtime destruction and exits0 with no mounted children. The driver requires that order's observable results. This is an actual before/after defect, not a waived timeout.

No blocking correctness finding in this experimental scope. Simplification already used: OneWindowsQueue is shared with smoke, and runtime/events/modules reuse the foundation. The trace-heavy host and detached stdin command reader are experimental process tooling, not a reusable production host API. No need to generalize them before this premise is settled.

Limits: Metro uses ios and Platform.OS reads ios. Only96dpi/1x interactive Hyper-V software display was exercised. This does not qualify a Windows resolver, arbitrary views/text/images, accessibility, multi-control navigation, high DPI, Debug, hardware performance, fullM1, or a final published package. The logged2-4ms acknowledgements are observations, not a performance acceptance target. Windows runtime DLL rebuild hashes differ. No canary or main merge was dispatched. Experimental integration still needs the shared native-core dependency and applicable feature scope/review disposition; it remains separate from the held Mac minor batch.

Disposition: complete t-mvmw37o0-7md0 as the bounded proof. No new author is needed to repeat it. The authorized assessment/prototype unit is complete; full Windows platform work is a separate scope decision. Retain pushed source and pro128 evidence for lead69213; CI103700 owns normal broader delivery. Parent captured one native-density WebP90, inspected1010x701,7476bytes, with no resizing or upscale.
