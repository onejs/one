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
args=(-workspace ios/OneBench.xcworkspace -scheme OneBench -configuration Release -derivedDataPath "$derived" -jobs "${BENCH_BUILD_JOBS:-4}" -packageAuthorizationProvider netrc "PRODUCT_BUNDLE_IDENTIFIER=dev.onestack.bench.$engine")
if [ "$target" = device ]; then
  args+=(-destination generic/platform=iOS -allowProvisioningUpdates -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_JY56N857ZK.p8" -authenticationKeyID JY56N857ZK -authenticationKeyIssuerID 69a6de72-dd97-47e3-e053-5b8c7c11a4d1 CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=399WY8X9HY)
  platform=iphoneos
else
  args+=(-destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO ARCHS=arm64 ONLY_ACTIVE_ARCH=YES)
  platform=iphonesimulator
fi
bun "$root/scripts/bench/artifacts.ts" clean "$derived/Build/Products/Release-$platform/OneBench.app" "$output/apps/$engine/OneBench.app"
nice -n 10 xcodebuild "${args[@]}" build > "$output/build-$engine-$target.log" 2>&1
if [ "$(git rev-parse HEAD)" != "$source_commit" ] || ! git diff --quiet HEAD -- examples/one-bench packages; then
  echo "source changed during build; discard this result" >&2
  exit 2
fi
mkdir -p "$output/apps/$engine"
ditto "$derived/Build/Products/Release-$platform/OneBench.app" "$output/apps/$engine/OneBench.app"
printf "%s\n" "$source_commit" > "$output/apps/$engine/commit.txt"
bun "$root/scripts/bench/artifacts.ts" manifest "$output/apps/$engine" "$engine" "$target"
