#!/bin/bash
# Builds and installs the standalone UI harness: a host app + a real
# Share extension embedding the actual ShareTarget/ sources (compiled
# directly, not copied/regenerated), so the compose controller can be
# exercised through a real system share sheet on a real simulator.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SHARE_TARGET_SRC="$ROOT/../../../ShareTarget"
OUT="$ROOT/.out"
rm -rf "$OUT"
mkdir -p "$OUT"

UDID="${1:?pass the target simulator UDID}"
SDK=$(xcrun --sdk iphonesimulator --show-sdk-path)
TARGET="arm64-apple-ios17.0-simulator"

echo "== Compiling HarnessShareExtension (application-extension, strict concurrency) =="
xcrun swiftc -sdk "$SDK" -target "$TARGET" \
  -swift-version 6 -strict-concurrency=complete -application-extension \
  -parse-as-library \
  -Xlinker -e -Xlinker _NSExtensionMain \
  -o "$OUT/HarnessShareExtension" \
  "$SHARE_TARGET_SRC/OneShareTargetAdapter.swift" \
  "$SHARE_TARGET_SRC/OneShareTargetConfiguration.swift" \
  "$SHARE_TARGET_SRC/OneShareTargetIntake.swift" \
  "$SHARE_TARGET_SRC/OneShareTargetDraftStore.swift" \
  "$SHARE_TARGET_SRC/OneShareTargetSubmissionCoordinator.swift" \
  "$SHARE_TARGET_SRC/OneShareComposeViewController.swift" \
  "$SHARE_TARGET_SRC/OneShareTargetViewController.swift" \
  "$ROOT/Shared/HarnessShareTargetAdapter.swift" \
  "$ROOT/ShareExtension/HarnessShareTargetAdapterExtensionOnly.swift" \
  "$ROOT/ShareExtension/GeneratedHarnessShareViewController.swift"

echo "== Compiling HarnessHost =="
xcrun swiftc -sdk "$SDK" -target "$TARGET" \
  -swift-version 6 \
  -parse-as-library \
  -o "$OUT/HarnessHost" \
  "$ROOT/Shared/HarnessShareTargetAdapter.swift" \
  "$ROOT/HostApp/AppDelegate.swift"

echo "== Assembling bundles =="
APP="$OUT/HarnessHost.app"
EXT="$APP/PlugIns/HarnessShareExtension.appex"
mkdir -p "$APP" "$EXT"
cp "$OUT/HarnessHost" "$APP/HarnessHost"
cp "$ROOT/HostApp/Info.plist" "$APP/Info.plist"
cp "$OUT/HarnessShareExtension" "$EXT/HarnessShareExtension"
cp "$ROOT/ShareExtension/Info.plist" "$EXT/Info.plist"

echo "== Codesigning (ad-hoc, with app-group entitlements) =="
codesign --force --sign - --entitlements "$ROOT/ShareExtension/ShareExtension.entitlements" "$EXT"
codesign --force --sign - --entitlements "$ROOT/HostApp/HostApp.entitlements" "$APP"

echo "== Installing on $UDID =="
xcrun simctl install "$UDID" "$APP"

echo "== Done: dev.one.sharetargetharness installed =="
