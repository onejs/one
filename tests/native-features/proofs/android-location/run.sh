#!/usr/bin/env bash
set -euo pipefail
lane_root=/Users/n8/.worktrees/one-native-android-api
evidence_root=/Users/n8/one/tests/native-features/evidence/android-restart-p66065
runtime_root="$evidence_root/runtime-location-restart-pro64"
mkdir -p "$runtime_root"
printf '%s\n' "$$" > "$runtime_root/runtime.pid"
oracle=/Users/n8/contrast/packages/rn-conformance/run-android-oracle.sh
export ANDROID_SDK_ROOT=/Users/n8/Library/Android/sdk
export ANDROID_ORACLE_PORT=5582
export PATH="/Users/n8/Library/Android/sdk/platform-tools:/Users/n8/.bun/bin:$PATH"
serial=emulator-5582
command -v adb bun
if adb devices | grep -q "$serial"; then
  echo "refusing attached device $serial; ownership must be established before reuse" >&2
  exit 1
fi
if lsof -nP -iTCP:8097 -sTCP:LISTEN; then
  echo "metro port 8097 is already held" >&2
  exit 1
fi
for device in $(adb devices | awk 'NR > 1 && $2 == "device" {print $1}'); do
  avd=$(adb -s "$device" emu avd name 2>/dev/null | head -1 || true)
  if [[ "$avd" == "sootsim_pixel_8_android_17_api_37_r06" ]]; then
    echo "refusing shared AVD already running as $device" >&2
    exit 1
  fi
done
if [[ ! -d "$lane_root" ]]; then
  git -C /Users/n8/one fetch origin tm/one-native-android-location-probe
  git -C /Users/n8/one worktree add --detach "$lane_root" d9f60f49a57e951a3a35c25b900018d3253d803f
fi
cd "$lane_root"
python3 - <<'CHECK_DIRTY'
import subprocess
allowed = {" M packages/one/types/platform/specs/OneCrypto.nitro.d.ts", "?? packages/one/types/platform/crypto/digest.d.ts"}
status = subprocess.check_output(["git", "status", "--porcelain"], text=True).splitlines()
assert not set(status) - allowed, status
CHECK_DIRTY
git fetch origin tm/one-native-android-location-probe
git switch -c tm/one-native-android-location-restart-peer d9f60f49a57e951a3a35c25b900018d3253d803f
test "$(git rev-parse HEAD)" = d9f60f49a57e951a3a35c25b900018d3253d803f
tm worktree adopt "$lane_root" --json > "$evidence_root/peer-input/api-worktree-owner.json"
bun install --frozen-lockfile
tar -xzf "$evidence_root/peer-input/one-android-system-beta-build.tgz" -C "$lane_root"
# reuse the validated native APK only when its library and fixture sources match.
test -z "$(git diff c4ba7378e858cd02d78d01cc8ade4cff7db8b705 HEAD -- packages/one tests/native-features/fixtures tests/native-features/app)"
printf '%s\n' '652f08da010fc553c4ed1a48874e54aa3af4d6f6e03a8581dfcbc92be0017a5d  '"$evidence_root/apk-share-fixed/one-native-app-icon-debug.apk" | shasum -a 256 -c -
shasum -a 256 "$lane_root/packages/one/android/src/main/java/com/margelo/nitro/one/HybridOneShare.kt" "$lane_root/tests/native-features/scripts/one-native-conformance.android.ts" > "$runtime_root/reused-source.sha256"
mkdir -p "$runtime_root"
emulator_pid=
metro_pid=
cleanup() {
  if [[ -n "$emulator_pid" ]] && kill -0 "$emulator_pid" 2>/dev/null; then
    ps -p "$emulator_pid" -o pid,ppid,args > "$runtime_root/owned-process.txt"
    lsof -nP -p "$emulator_pid" > "$runtime_root/owned-files.txt" || true
    adb -s "$serial" emu kill || kill "$emulator_pid"
    wait "$emulator_pid" || true
  fi
  if [[ -n "$metro_pid" ]]; then
    metro_listener=$(lsof -t -nP -iTCP:8097 -sTCP:LISTEN || true)
    if [[ -n "$metro_listener" ]]; then
      ps -p "$metro_listener" -o pid,ppid,args > "$runtime_root/metro-process.txt"
      lsof -nP -p "$metro_listener" > "$runtime_root/metro-files.txt" || true
      kill "$metro_listener" 2>/dev/null || true
    fi
    kill "$metro_pid" 2>/dev/null || true
    wait "$metro_pid" || true
  fi
}
trap cleanup EXIT
cd "$lane_root/tests/native-features"
bun run dev --port 8097 > "$runtime_root/metro.log" 2>&1 &
metro_pid=$!
bash "$oracle" start > "$runtime_root/emulator.log" 2>&1 &
emulator_pid=$!
printf '%s\n' "$emulator_pid" > "$runtime_root/emulator.pid"
bash "$oracle" wait | tee "$runtime_root/device.txt"
curl -fsS --max-time 10 http://127.0.0.1:8097/status > "$runtime_root/metro-status.txt"
# complete the fixture's cold android bundle before timing on-device behavior.
curl -fsS --max-time 180 'http://127.0.0.1:8097/index.bundle?platform=android&dev=true&minify=false' -o "$runtime_root/prepared.android.bundle"
test -s "$runtime_root/prepared.android.bundle"
shasum -a 256 "$runtime_root/prepared.android.bundle" > "$runtime_root/prepared-bundle.sha256"
# the baseline removed this owned fixture; require a fresh package before installation.
test -z "$(adb -s "$serial" shell pm path dev.vxrn.nativefeatures.tests)"
adb -s "$serial" install "$evidence_root/apk-share-fixed/one-native-app-icon-debug.apk"
adb -s "$serial" shell pm clear dev.vxrn.nativefeatures.tests
adb -s "$serial" reverse tcp:8081 tcp:8097
set +e
bun scripts/one-native-conformance.android.ts --device-id "$serial" --package-id dev.vxrn.nativefeatures.tests --metro-port 8097 --suite system-location --artifact-dir "$runtime_root/system" 2>&1 | tee "$runtime_root/system.log"
proof_status=${PIPESTATUS[0]}
set -e
adb -s "$serial" shell dumpsys package dev.vxrn.nativefeatures.tests > "$runtime_root/package-state-after.txt"
adb -s "$serial" shell dumpsys activity activities > "$runtime_root/activity-state-after.txt"
adb -s "$serial" logcat -d -b events > "$runtime_root/events.txt"
adb -s "$serial" logcat -d > "$runtime_root/logcat.txt"
bash "$oracle" capture "$runtime_root/final"
# remove only the owned fixture after retaining its component-state proof.
adb -s "$serial" uninstall dev.vxrn.nativefeatures.tests
git rev-parse HEAD > "$runtime_root/source.txt"
shasum -a 256 scripts/one-native-conformance.android.ts app/one-native-android-pickers.tsx "$evidence_root/apk-share-fixed/one-native-app-icon-debug.apk" > "$runtime_root/fixture.sha256"
# preserve generated route content, then restore only this run's own output.
cp "$lane_root/tests/native-features/app/routes.d.ts" "$runtime_root/generated-routes.d.ts"
git -C "$lane_root" show HEAD:tests/native-features/app/routes.d.ts > "$lane_root/tests/native-features/app/routes.d.ts"
git -C "$lane_root" status --short > "$runtime_root/worktree-status.txt"
exit "$proof_status"
