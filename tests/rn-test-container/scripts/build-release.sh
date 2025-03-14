set -x
set -e
set -o pipefail # Since we pipe the output to xcpretty, we need this to fail this step if `xcrun xcodebuild` fails

# yarn prebuild:native --platform ios --no-install # --no-install is used to skip installing dependencies, specifically `pod install` as we want to do it after the Cache Pods step
yarn prebuild:native --platform ios

xcrun xcodebuild -scheme 'RNTestContainer' \
  -workspace "ios/RNTestContainer.xcworkspace" \
  -configuration Release \
  -sdk 'iphonesimulator' \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build | tee xcodebuild.log | xcpretty
