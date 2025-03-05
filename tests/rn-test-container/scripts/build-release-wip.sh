set -o pipefail # Since we pipe the output to xcpretty, we need this to fail this step if `xcrun xcodebuild` fails

PROJ_DIRNAME="$(dirname $(dirname -- "$( readlink -f -- "$0"; )";))"

echo "cd into PROJ_DIRNAME: ${PROJ_DIRNAME}"

cd "${PROJ_DIRNAME}"

yarn prebuild:native --platform ios

xcrun xcodebuild -scheme 'RNTestContainer' \
  -workspace "ios/RNTestContainer.xcworkspace" \
  -configuration Release \
  -sdk 'iphonesimulator' \
  -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath build | tee xcodebuild.log | xcpretty
