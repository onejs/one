#!/usr/bin/env bash
set -euo pipefail

consumer=$1
gradle_bin=$2
serial=$3
evidence=$4
: "${ADB:?set ADB to the Android SDK adb executable}"
: "${SIM_CLAIM_SCRIPT:?set SIM_CLAIM_SCRIPT to the shared sim-claim.sh}"
source_root=$(cd "$(dirname "$0")/../../../.." && pwd)
proof_root="$source_root/tests/native-features/fixtures/background-tasks-android"
mkdir -p "$evidence"
cleanup() {
  result=$?
  echo "$result" > "$evidence/proof-job-exit.txt"
  "$ADB" -s "$serial" shell dumpsys battery reset || true
  "$ADB" -s "$serial" emu kill || true
  "$SIM_CLAIM_SCRIPT" release "$serial"
}
trap cleanup EXIT
cd "$source_root"
git rev-parse HEAD > "$evidence/source-commit.txt"
node "$proof_root/build-bundle.cjs" 2>&1 | tee "$evidence/background-bundle.txt"
"$gradle_bin" -p "$consumer" -I "$proof_root/proof.init.gradle" \
  "-Done.services.sourceRoot=$source_root" -PreactNativeArchitectures=arm64-v8a \
  --max-workers=4 :app:assembleDebug 2>&1 | tee "$evidence/background-app-build.txt"
shasum -a 256 "$proof_root/assets/index.android.bundle" \
  "$proof_root/build/outputs/apk/debug/app-debug.apk" > "$evidence/artifact-sha256.txt"
node "$proof_root/run-proof.mjs" "$serial" \
  "$proof_root/build/outputs/apk/debug/app-debug.apk" "$evidence"
