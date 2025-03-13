set -o pipefail # Since we pipe the output to xcpretty, we need this to fail this step if `xcrun xcodebuild` fails

export SIMULATOR_IOS_VERSION=18
export SIMULATOR_DEVICE_NAME="iPhone 16 Pro"

AVAILABLE_SIMULATORS=$(xcrun simctl list devices available --json | jq -r '[.devices | to_entries[] | select(.key | contains("SimRuntime.iOS")) | .key as $runtime | .value[] | { runtime: $runtime, name: .name, udid: .udid }]')
echo "Available simulators: $AVAILABLE_SIMULATORS"

SELECTED_SIMULATOR=$(echo $AVAILABLE_SIMULATORS | jq -r "[.[] | select(.runtime | contains(\"$SIMULATOR_IOS_VERSION\")) | select(.name | \"$SIMULATOR_DEVICE_NAME\")] | first")
if [ -z "$SELECTED_SIMULATOR" ] || [ "$SELECTED_SIMULATOR" = "null" ]; then
  echo "Error: No simulator found for iOS version $SIMULATOR_IOS_VERSION and device name $SIMULATOR_DEVICE_NAME"
  exit 1
fi
echo "Selected simulator: $SELECTED_SIMULATOR"

export SIMULATOR_UDID=$(echo $SELECTED_SIMULATOR | jq -r .udid)
if [ -z "$SIMULATOR_UDID" ] || [ "$SIMULATOR_UDID" = "null" ]; then
  echo "Error: Could not get simulator UDID"
  exit 1
fi
echo "Simulator UDID: $SIMULATOR_UDID"
# echo "simulator_udid=$SIMULATOR_UDID" >> $GITHUB_OUTPUT

# https://github.com/onejs/one/blob/main/.github/workflows/test-native-ios.yml#L79
xcrun simctl boot $SIMULATOR_UDID
