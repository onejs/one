set -x
set -e
set -o pipefail # Since we pipe the output to xcpretty, we need this to fail this step if `xcrun xcodebuild` fails

# yarn prebuild:native --platform ios --no-install # --no-install is used to skip installing dependencies, specifically `pod install` as we want to do it after the Cache Pods step
yarn prebuild:native --platform ios
pod install --project-directory=ios # do this again since expo is somehow reliable on running `pod install` during prebuild when prebuild has already been run before

xcrun xcodebuild -scheme 'RNTestContainer' \
  -workspace "ios/RNTestContainer.xcworkspace" \
  -configuration Release \
  -sdk 'iphonesimulator' \
  -destination 'generic/platform=iOS Simulator' \
  -archivePath build \
  -derivedDataPath build | tee xcodebuild.log | xcpretty
