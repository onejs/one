# One.openURL / openShare / openSettings: iOS runtime receipt

Status: workspace runtime acceptance completed on iPhone 17 Pro/iOS 27.0,
2026-10-07. Source and runner change: `912709720`. Coverage reconciliation:
`p67085 / one-native-ready`. Production acceptance remains separate.

## Current acceptance

RAN worker receipts under
`tests/native-features/evidence/realapps/share-cancel-controls/`:

- Share Copy presents UIActivityViewController with the probe text and
  records `sharedAction` / `com.apple.UIKit.activity.CopyToPasteboard`.
- Share cancellation taps outside the sheet, records `dismissedAction`
  with null activity type, waits for Copy to disappear and asserts return
  to the app. Both One calls settle void.
- URL opens Safari with onestack.dev in its address bar and resolves true.
  Settings opens the Settings root and settles void. Both return to the
  app with `inactive,background,active`. An app-specific settings page is unproved.
- Resolve-only URL and Settings control fixtures fail their destination
  assertions with exit 1. Restoring the fixture and running all three
  selected APIs passes with exit 0.
- The first Copy accessibility tap records dismissal instead of sharing,
  and the runner rejects it. The corrected screen coordinate passes the
  activity assertion. The runner rejects every failed action it records.

These are worker runtime receipts read by the parent. The parent ran the
fixture typecheck and runner build and checked the retained result shapes;
it did not repeat the native run.

`restored-positive/identity.json` binds source base `643bb9504`, working diff,
fixture and runner hashes, runtime source and dist hashes, bundle SHA256
`894d4c268fd8094275fd71ffa055f28f0193ff78e4920ff0bb53cfb619a95c6c`,
and installed native executable SHA256
`318da9592123f5820a0bb158e4ba31d22b97d0851b043c8484c41519aeb2021e`.
Device is `A9BF26C8-2214-4DC6-AA9E-877B19A49FE9`, iPhone 17 Pro,
iOS 27.0 build `24A434`, app `com.natew.oneexample`.

The vehicle is One Basic with injected real-app fixtures and workspace One.
The native shell was reused from the first worker, with its installed hash
verified; its original build source is not newly authenticated to this HEAD.
This proves the selected workspace JS service paths on that shell. It does
not prove a current npm tarball, production binary, Android or another device.

The matrix records `realapps:external` only for these three iOS APIs.
Android suites remain missing. The launch checklist closes this bounded
iOS unit while current real-app production acceptance remains open.
DocumentPicker is outside the selected APIs; its original full-flow presenter
failure remains open. The new subset does not hide or close it.
Copy and outside-tap coordinates were run on this device only.

## Earlier receipt

The first unit below proved Copy and handoff; cancellation and actual failure
controls were added by the current acceptance above.

## What was proven

- `One.openShare`: UIActivityViewController presented with the probe text
  (`system-share.png`, `Copy` asserted), Copy tapped, sheet dismissed, app
  foregrounded (`Open share for runner cancel` asserted), promise settled
  void. RAN.
- `One.openURL(https://onestack.dev)`: Safari foreground at onestack.dev
  (`system-url.png`, `.*onestack.*` asserted), back-to-OneBasic chevron,
  `launchApp` return asserted, AppState `inactive,background,active`.
  Promise resolves `true` (matches the prior Contrast receipt, not void).
  RAN.
- `One.openSettings()`: Settings app root foreground (`system-settings.png`,
  `.*Settings.*` asserted), return asserted, AppState
  `inactive,background,active`. Promise resolves void. RAN.

## Identity

- Source: `~/one` v2-beta `4d946b837`, runtime `packages/one/src`
  (`0c5548b8d`), workspace `one@1.27.1`, dist rebuilt from HEAD before the
  run. Native shell: proof app `com.natew.oneexample` built by
  `realapps-ios-build.ts` (xcodebuildmcp) on the claimed sim, JS from
  `one dev` on port 8097. Vehicle: `examples/one-basic` + injected
  realapps fixtures (public only, removed after).
- Simulator: iPhone 17 Pro, iOS 27.0,
  `0FC55879-D544-420F-8BBD-521C9268E14A`, claimed via sim-claim.
- Evidence: `tests/native-features/evidence/realapps/open-url-share-settings/`
  (api-results.json, receipt.json, external.yaml, five screenshots).
- Focused checks: fixture typecheck (`tsc -p fixtures/realapps-api-tsconfig`)
  was reported clean by the worker. RAN parent rerun on `ec569a328` fails
  TS2367 because `openURL` is declared `Promise<void>` while the native
  assertion expects true. Reading the native value as `unknown` repairs
  the probe typing; the same typecheck exits 0. Returning the value from
  the probe preserves it for the next receipt instead of recording void.
  The assertion itself is unchanged. RAN parent runner build exits 0;
  the original worker Maestro flow records exit 0. No second native run
  is claimed for the typing and receipt correction.

## Changes (this unit only)

- `tests/native-features/scripts/realapps-native-ui.ts`: iOS external flow
  destination/return assertions (Copy dismiss, onestack/Settings waits,
  post-dismiss and post-return asserts), AppState failure controls
  (background+active required; stubs that never leave the app fail).
- `tests/native-features/fixtures/realapps-api-services.native.tsx`: pin
  settle contracts (share/settings resolve void, openURL resolves true);
  doc-picker Recents settle guard is runner-side.

## Limitations

- Settings opens the Settings app root on iOS 27.0, not the app-specific
  page; handoff+return proven, deep page not claimed.
- Safari page body still loading in the capture; destination proven by the
  address bar, not page content.
- `One.DocumentPicker` failed in this vehicle with
  `E_DOCUMENT_PICKER_FAILED: found no view controller to present from`
  (strict presenter guard vs automation speed). Pre-existing sibling-lane
  flake, untouched by this unit; the required `--apis` run still passes.
- No Android work or new public API. Coverage reconciliation is recorded above.

## Incidental findings for owners

- RAN: dev-mode native bundles on this checkout contained two React copies
  (root real dir + stale Sep-8 `packages/*/node_modules/react` symlinks
  into `.bun`), crashing every app at Root. Removed three stale symlinks
  (`color-scheme`, `use-isomorphic-layout-effect`); bundle verified
  single-copy, home renders. Other packages still carry Sep-8 links.
- INFERRED: all sims on the box shut down ~10:42 (including another live
  session's); rebooted only the claimed one.
