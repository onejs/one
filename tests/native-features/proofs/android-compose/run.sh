#!/usr/bin/env bash
set -euo pipefail
lane_root=/Users/n8/.worktrees/one-native-android
evidence_root=/Users/n8/one/tests/native-features/evidence/android-restart-p66065
runtime_root="$evidence_root/runtime-compose-warm-pro128"
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
adb -s "$serial" install -r "$evidence_root/apk/one-native-debug.apk"
adb -s "$serial" shell pm clear dev.vxrn.nativefeatures.tests
adb -s "$serial" reverse tcp:8081 tcp:8097
set +e
bun scripts/one-native-conformance.android.ts --device-id "$serial" --package-id dev.vxrn.nativefeatures.tests --metro-port 8097 --suite compose --artifact-dir "$runtime_root/compose" 2>&1 | tee "$runtime_root/compose.log"
proof_status=${PIPESTATUS[0]}
set -e
adb -s "$serial" logcat -d > "$runtime_root/logcat.txt"
bash "$oracle" capture "$runtime_root/final"
git rev-parse HEAD > "$runtime_root/source.txt"
shasum -a 256 scripts/one-native-conformance.android.ts app/one-native-android-pickers.tsx "$evidence_root/apk/one-native-debug.apk" > "$runtime_root/fixture.sha256"
exit "$proof_status"
