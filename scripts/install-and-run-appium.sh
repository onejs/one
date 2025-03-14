#!/usr/bin/env zsh
set -x
set -e
set -o pipefail # Since we pipe the output to xcpretty, we need this to fail this step if `xcrun xcodebuild` fails

# npm install -g appium
# appium driver install xcuitest
# Check if the driver is installed
DRIVER_NAME=xcuitest
# INSTALLED=$(appium driver list --installed | grep -w "$DRIVER_NAME")
# Check if the driver is installed by parsing the JSON output
INSTALLED_VERSION=$(npx -y appium driver list --installed --json | jq -r ".$DRIVER_NAME.version")
if [[ "$INSTALLED_VERSION" != "null" ]]; then
    echo "Driver '$DRIVER_NAME' is already installed (version: $INSTALLED_VERSION)."
else
    echo "Installing driver '$DRIVER_NAME'..."
    npx appium driver install --source=npm appium-$DRIVER_NAME
fi
npx appium > /tmp/appium.log &
sleep 3
