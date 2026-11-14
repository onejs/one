#!/bin/bash
set -euo pipefail
engine=${1:?usage: build-ios.sh hermes\|bun [device\|simulator] [--no-prebuild]}
target=${2:-device}
case "$engine" in hermes|bun) ;; *) exit 2;; esac
case "$target" in device|simulator) ;; *) exit 2;; esac
root=$(git rev-parse --show-toplevel)
source_commit=$(git rev-parse HEAD)
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
case "${3:-}" in
  "") bun run prebuild:native --platform ios > "$output/prebuild-$engine-$target.log" 2>&1 ;;
  --no-prebuild) ;;
  *) exit 2 ;;
esac
args=(-workspace ios/OneBench.xcworkspace -scheme OneBench -configuration Release -derivedDataPath "$derived" -jobs "${BENCH_BUILD_JOBS:-4}" -packageAuthorizationProvider netrc)
if [ "$target" = device ]; then
  args+=(-destination generic/platform=iOS -allowProvisioningUpdates -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_JY56N857ZK.p8" -authenticationKeyID JY56N857ZK -authenticationKeyIssuerID 69a6de72-dd97-47e3-e053-5b8c7c11a4d1 CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=399WY8X9HY "PRODUCT_BUNDLE_IDENTIFIER=dev.onestack.bench.$engine")
  platform=iphoneos
else
  args+=(-destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO ARCHS=arm64 ONLY_ACTIVE_ARCH=YES)
  platform=iphonesimulator
fi
python3 - "$derived/Build/Products/Release-$platform/OneBench.app" "$output/apps/$engine/OneBench.app" <<'PYCLEAN'
from pathlib import Path
import shutil
import sys
for value in sys.argv[1:]:
    app = Path(value)
    if app.exists():
        if app.name != 'OneBench.app' or app.is_symlink():
            raise RuntimeError(f'unexpected app product: {app}')
        shutil.rmtree(app)
PYCLEAN
nice -n 10 xcodebuild "${args[@]}" build > "$output/build-$engine-$target.log" 2>&1
if [ "$(git rev-parse HEAD)" != "$source_commit" ] || ! git diff --quiet HEAD -- examples/one-bench packages; then
  echo "source changed during build; discard this result" >&2
  exit 2
fi
mkdir -p "$output/apps/$engine"
ditto "$derived/Build/Products/Release-$platform/OneBench.app" "$output/apps/$engine/OneBench.app"
printf "%s\n" "$source_commit" > "$output/apps/$engine/commit.txt"
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
bundle = (folder / 'OneBench.app/main.jsbundle').read_bytes()
if engine == 'hermes' and bundle[:8] != bytes.fromhex('c61fbc03c103191f'):
    raise RuntimeError('Hermes build does not contain shipped Hermes bytecode')
if engine == 'bun':
    if bundle != b'/*bun-compiled-entry*/':
        raise RuntimeError('Bun build has no compiled entry marker')
    for framework in ['Bun', 'BunCompat']:
        binary = folder / f'OneBench.app/Frameworks/{framework}.framework/{framework}'
        metadata[f'{framework}Sha256'] = hashlib.sha256(binary.read_bytes()).hexdigest()
metadata['bundleSha256'] = hashlib.sha256(bundle).hexdigest()
(folder / 'build.json').write_text(json.dumps(metadata, indent=2) + '\n')
PYMETA
