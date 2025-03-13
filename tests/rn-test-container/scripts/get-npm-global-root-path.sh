set -x
set -e
set -o pipefail # Since we pipe the output to xcpretty, we need this to fail this step if `xcrun xcodebuild` fails

NPM_GLOBAL_ROOT_PATH=$(npm root -g)
echo "NPM global root path: $NPM_GLOBAL_ROOT_PATH"
# echo "path=$NPM_GLOBAL_ROOT_PATH" >> $GITHUB_OUTPUT
