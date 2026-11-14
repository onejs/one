#!/bin/bash
set -euo pipefail
engine=${1:?usage: build-ios.sh hermes\|bun [device\|simulator]}
target=${2:-device}
case "$engine" in hermes|bun) ;; *) exit 2;; esac
case "$target" in device|simulator) ;; *) exit 2;; esac
root=$(git rev-parse --show-toplevel)
output=${BENCH_OUTPUT_DIR:-$HOME/builders/.scratch/bun-bench}
export BENCH_ENGINE=$engine
export ONE_BUN_ENGINE_DIR=${ONE_BUN_ENGINE_DIR:-$HOME/builders/.scratch/bun-aot-rn/engine}
mkdir -p "$output"
cd "$root/examples/one-bench"
bun run prebuild:native --platform ios > "$output/prebuild-$engine-$target.log" 2>&1
args=(-workspace ios/OneBench.xcworkspace -scheme OneBench -configuration Release -derivedDataPath "$output/derived-$engine-$target" -jobs "${BENCH_BUILD_JOBS:-4}" -packageAuthorizationProvider netrc)
if [ "$target" = device ]; then
  args+=(-destination generic/platform=iOS -allowProvisioningUpdates -authenticationKeyPath "$HOME/.appstoreconnect/private_keys/AuthKey_JY56N857ZK.p8" -authenticationKeyID JY56N857ZK -authenticationKeyIssuerID 69a6de72-dd97-47e3-e053-5b8c7c11a4d1 CODE_SIGN_STYLE=Automatic DEVELOPMENT_TEAM=399WY8X9HY)
  platform=iphoneos
else
  args+=(-destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO)
  platform=iphonesimulator
fi
nice -n 10 xcodebuild "${args[@]}" build > "$output/build-$engine-$target.log" 2>&1
mkdir -p "$output/apps/$engine"
ditto "$output/derived-$engine-$target/Build/Products/Release-$platform/OneBench.app" "$output/apps/$engine/OneBench.app"
git rev-parse HEAD > "$output/apps/$engine/commit.txt"
