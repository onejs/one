set -x
set -e
set -o pipefail # Since we pipe the output to xcpretty, we need this to fail this step if `xcrun xcodebuild` fails

PROJ_DIRNAME="$(dirname $(dirname -- "$( readlink -f -- "$0"; )";))"

echo "cd into PROJ_DIRNAME: ${PROJ_DIRNAME}"

cd "${PROJ_DIRNAME}"

$PROJ_DIRNAME/scripts/build-release.sh

# https://github.com/onejs/one/blob/main/.github/actions/install/action.yml
# npx playwright install

# https://github.com/onejs/one/blob/main/.github/workflows/test-native-ios.yml#L55
$PROJ_DIRNAME/scripts/get-simulator-udid.sh

# https://github.com/onejs/one/blob/main/.github/workflows/test-native-ios.yml#L84
$PROJ_DIRNAME/scripts/get-npm-global-root-path.sh

# https://github.com/onejs/one/blob/main/.github/workflows/test-native-ios.yml#L96
$PROJ_DIRNAME/scripts/install-and-run-appium.sh

# https://github.com/onejs/one/blob/main/.github/workflows/test-native-ios.yml#L108
yarn test-ios
