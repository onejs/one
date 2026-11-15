#!/bin/zsh
# usage: build.sh <workspace dir holding the .xcworkspace> <scheme> <derived data dir>
# release build for the simulator, arm64 only. run it under `tm window run heavy`.
set -e
export LANG=en_US.UTF-8 LC_ALL=en_US.UTF-8
cd "$1"
xcodebuild -scheme "$2" -workspace "$2.xcworkspace" -configuration Release -sdk iphonesimulator \
  -destination 'generic/platform=iOS Simulator' -derivedDataPath "$3" ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  'EXCLUDED_ARCHS[sdk=iphonesimulator*]=x86_64' > "$3.log" 2>&1
tail -5 "$3.log"
