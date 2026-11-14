---
id: t-muz6ehej-1p0p0
title: Require native widget surfaces in the realapps runner
status: canceled
assignees:
- s23249
labels:
- branch:fix/widget-runner-land-s18183
- branch:fix/widget-runner-s18183
- delivery:pending-ci
- lane:one-ci-delivery
- lane:widget-runner
- umbrella:opus-pool
- umbrella:plans/one-native-real-apps.md
backend: git
created_at: 1791442149787
updated_at: 1793089896839
field_marks:
  active_form: 1791442149787
  assigned:m22158: 1791446559444
  assigned:r77298: 1791576164618
  assigned:s23249: 1791577069288
  body: 1793089896839
  claim: 1791442149787
  evidence_summary: 1791442149787
  owner_status: 1791442149787
  parent: 1791442149787
  priority: 1791442149787
  recovery_ref: 1791442149787
  status: 1793089896839
  title: 1791442149787
  unassigned:m22158: 1791576164618
  unassigned:r77298: 1791577069288
  unassigned:s18183: 1791446559444
---
TESTED: native widget runner repair landed and pushed to v2-beta at 53a76d8647466077aa0d751c8e5520e78c7e3426; clean save branch fix/widget-runner-land-s18183. Five paths: owning UI runner plus native widget helper, existing widget tests, bounded coverage registrations and generated COVERAGE.md. Approved fixture82a413d12 unchanged; no native source/build/public API changes.

RAN: original unchanged runner exited0 with authenticated original bad native app while installed Home widget remained One Status. TESTED: final repaired runner exited1 on identical Step2/Open probe desired-state assertion; fail-home-jsx-seed.json contains only native One Status. canonical-settings-launch and restored both exit0 for Home scalar Native API probe/42/real app snapshot, JSX Step2/Open probe, omitted writes rejecting the same assertions and actual writes restoring acceptance.

TESTED: scalar/JSX cover-sheet start/update/end use exact native IDs, unchanged holder PID, native Created/Updating/Activity dismissed events, rendered state preconditions, stale omitted updates rejecting desired-state assertions and real updates restoring them. Actual native AX absence plus dismissed events proves end. Expanded JSX native renderer AX passes original approved strict bounds, single-line title, corner inset, icon/link, gauge/progress33/67%. Simulator PNG excludes expanded overlay, so this is AX proof, not fresh expanded visual acceptance. Prior Nate-approved title pixels remain in ../one-widget-title-s17665. Descriptor false never proves absence. IDs and evidence inventory in result.json.

TESTED: 9 focused widget/coverage tests; scoped runner and fixture types, focused lint, proof guard and diff checks pass. Native app/dylib/extension/preview hashes, selected current source/emitted fixture/facade/serializer bindings and unchanged native inputs authenticated (final-source.identity.json). Reused normal SDK27.0 capability app; RN0.87.1/Worklets0.12.2/Reanimated4.6.0/HBC98 manifest preserved. Three prior compiler objects were not retained and were not freshly verified.

Limits: scoped AppRegistry entry; full root/aggregate remains unaccepted. Registration alone is not suite promotion. Compact/minimal, scalar Island, hardware lock, PiP, Android rendering, public guides and package/production proof remain elsewhere. Parent p67085 owns aggregate/docs; Contrast delivery p67014. One CI owner m22158 owns pending Checks and Tests/release.yml canary, package version and exact tarball content check. No worker watcher or completion mail. Task t-muz6ehej-1p0p0 stays open for CI.

Cleanup: owned server/collector/loggers stopped, app uninstalled, simulator shut down and claim released, managed worktree removed; proofs/source retained here. Preexisting DeviceHub frontend and another session's staleness watcher retained as user/other-session resources. Optimization: reuse authenticated native target/SDK caches; keep canonical One/React dependency roots unique rather than hydrating duplicates.

Evidence: /Users/n8/.local/share/one-widget-runner-s18183; source/ and landed.patch preserve final source. Native controls and approved prior artifacts remain read-only.

2026-10-09 delivery successor r77298: owns task closure and package receipts; live workflow CI owner s23249 retains watch w-0b3a1d on successor d805dc57eaed6967fcdf99450271ec3e35c06449 (Checks 37984044990, Android 37984044905, iOS 37984045105, Release 37984044939). Coordinator notified of overlapping ownership; no duplicate CI watcher.
RAN: prior Release 37978595545 succeeded; npm vxrn@2.0.0-0.canary.1791573658920 manifest releaseSourceCommit=b22d978610c56b4abdfb6fbc019e60746182239f. Git ancestor probe confirms media d7d970ae is included. Published src/plugins/reactNativeDevServer.ts matches that release source byte for byte. TESTED: isolated published dist asset handler passes five range/invalid range/If-Range/HEAD cases plus mp4/txt MIME. Full plugin was not instantiated. Evidence /Users/n8/.local/share/one-ci-delivery-r77298/media-tarball-receipt.json and published-media-probe.mjs.
Delivery remains OPEN pending required iOS/other successor workflow verdicts and remaining native receipts. Failure discriminator: incorrect package source fails manifest/source-byte assertions; incorrect range artifact fails status/header/body probe assertions. Optimization noticed: reuse exact package receipt across tasks covered by one release source rather than fetching or rebuilding per task.

2026-10-09 coordinator direction: s23249 is the sole One CI owner; duplicate one-ci-delivery assignment is ended. Delivery ownership transferred to s23249. Required workflow/native/package proof remains open; no task closed by this transfer.
RAN package receipt: vxrn@2.0.0-0.canary.1791573658920 releaseSourceCommit b22d978610c56b4abdfb6fbc019e60746182239f; published asset-server source matches that commit byte for byte, and media d7d970ae is its ancestor. TESTED isolated published dist handler: five byte-range/invalid-range/If-Range/HEAD cases and media MIME pass. Receipt /Users/n8/.local/share/one-ci-delivery-r77298/media-tarball-receipt.json; executable probe published-media-probe.mjs in the same directory. This receipt proves media packaging only; widget/FileSystem packaging and remaining runtime/build receipts are not claimed. Required successor d805dc57eaed6967fcdf99450271ec3e35c06449 workflows are owned by s23249. Further optimization: share one exact-source package receipt across covered tasks.

Team Machine canceled this task: untouched for 7+ days with no live assignee. Reopen with `tm task update t-muz6ehej-1p0p0 --status open`.
