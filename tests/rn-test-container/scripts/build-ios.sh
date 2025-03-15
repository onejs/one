#!/usr/bin/env zsh
set -x
set -e
set -o pipefail # Since we pipe the output to xcpretty, we need this to fail this step if `xcrun xcodebuild` fails

CONFIGURATION=$1

if [ -z "$CONFIGURATION" ]; then
  echo "Error: expected 'Debug' or 'Release' as the first argument"
  exit 1
fi

cd "$(dirname "$0")/.."

# yarn prebuild:native --platform ios --no-install # --no-install is used to skip installing dependencies, specifically `pod install` as we want to do it after the Cache Pods step
yarn prebuild:native --platform ios
pod install --project-directory=ios # do this again since expo is somehow reliable on running `pod install` during prebuild when prebuild has already been run before

xcrun xcodebuild -scheme 'RNTestContainer' \
  -workspace "ios/RNTestContainer.xcworkspace" \
  -configuration "${CONFIGURATION}" \
  -sdk 'iphonesimulator' \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$(./scripts/get-ios-derived-data-path.sh "$CONFIGURATION")" | tee xcodebuild.log | xcpretty

OUTPUT_APP_PATH="$(./scripts/get-ios-built-app-path.sh "$CONFIGURATION")"

if [ -d "$OUTPUT_APP_PATH" ]; then
  echo "Build completed, built app located at $OUTPUT_APP_PATH."
else
  echo "Error: expect $OUTPUT_APP_PATH to exists after the build but it does not."
  exit 1
fi
