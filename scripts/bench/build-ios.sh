#!/bin/bash
set -euo pipefail
engine=${1:?usage: build-ios.sh hermes\|bun [device\|simulator]}
target=${2:-device}
case "$engine" in hermes|bun) ;; *) exit 2;; esac
case "$target" in device|simulator) ;; *) exit 2;; esac
root=$(git rev-parse --show-toplevel)
output=${BENCH_OUTPUT_DIR:-$HOME/builders/.scratch/bun-bench}
derived=${BENCH_DERIVED_DATA:-$output/derived-$target}
export BENCH_ENGINE=$engine
export ONE_BUN_ENGINE_DIR=${ONE_BUN_ENGINE_DIR:-$HOME/builders/.scratch/bun-aot-rn/engine}
mkdir -p "$output"
if ! git -C "$root" diff --quiet HEAD -- examples/one-bench packages; then
  echo "commit benchmark and engine source before building" >&2
  exit 2
fi
cd "$root/examples/one-bench"
bun run prebuild:native --platform ios > "$output/prebuild-$engine-$target.log" 2>&1
args=(-workspace ios/OneBench.xcworkspace -scheme OneBench -configuration Release -derivedDataPath "$derived" -jobs "${BENCH_BUILD_JOBS:-4}" -packageAuthorizationProvider netrc)
if [ "$target" = device ]; then
  args+=(-destination generic/platform=iOS -allowProvisioningUpdates -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_JY56N857ZK.p8" -authenticationKeyID JY56N857ZK -authenticationKeyIssuerID 69a6de72-dd97-47e3-e053-5b8c7c11a4d1 CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=399WY8X9HY)
  platform=iphoneos
else
  args+=(-destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO ARCHS=arm64 ONLY_ACTIVE_ARCH=YES)
  platform=iphonesimulator
fi
nice -n 10 xcodebuild "${args[@]}" build > "$output/build-$engine-$target.log" 2>&1
mkdir -p "$output/apps/$engine"
ditto "$derived/Build/Products/Release-$platform/OneBench.app" "$output/apps/$engine/OneBench.app"
git rev-parse HEAD > "$output/apps/$engine/commit.txt"
python3 - "$output/apps/$engine" "$engine" "$target" <<'PYMETA'
import hashlib
import json
from pathlib import Path
import subprocess
import sys
folder, engine, target = Path(sys.argv[1]), sys.argv[2], sys.argv[3]
files = sorted(p for p in (folder / 'OneBench.app').rglob('*') if p.is_file())
metadata = dict(engine=engine, target=target, commit=(folder / 'commit.txt').read_text().strip(),
                xcode=subprocess.check_output(['xcodebuild', '-version'], text=True).strip(),
                appBytes=sum(p.stat().st_size for p in files))
metadata['bundleSha256'] = hashlib.sha256((folder / 'OneBench.app/main.jsbundle').read_bytes()).hexdigest()
(folder / 'build.json').write_text(json.dumps(metadata, indent=2) + '\n')
PYMETA
