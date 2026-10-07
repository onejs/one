# One.openURL / openShare / openSettings: iOS runtime receipt

Status: runtime-proven on iOS 27.0 simulator 2026-10-07. Coverage-table
reconciliation belongs to the parent; the launch-checklist box stays unticked
here.

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
  clean; runner bundles (`bun build --target bun`) clean; Maestro external
  flow exits 0 with `RAN ... assertions passed`.

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
- No Android work, no coverage-table edits, no new public API.

## Incidental findings for owners

- RAN: dev-mode native bundles on this checkout contained two React copies
  (root real dir + stale Sep-8 `packages/*/node_modules/react` symlinks
  into `.bun`), crashing every app at Root. Removed three stale symlinks
  (`color-scheme`, `use-isomorphic-layout-effect`); bundle verified
  single-copy, home renders. Other packages still carry Sep-8 links.
- INFERRED: all sims on the box shut down ~10:42 (including another live
  session's); rebooted only the claimed one.
