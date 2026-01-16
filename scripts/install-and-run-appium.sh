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
    # npx appium driver install --source=npm appium-$DRIVER_NAME # not working
    npx appium driver install xcuitest
fi
# Kill any existing Appium process (may be hung from previous run)
if lsof -i :4723 >/dev/null 2>&1; then
    echo "Killing existing Appium process on port 4723..."
    lsof -ti :4723 | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Start fresh Appium (subshell ensures process stays backgrounded)
(npx appium > /tmp/appium.log 2>&1 &)

# Wait for Appium to start (up to 30 seconds)
echo "Waiting for Appium to start..."
for i in {1..30}; do
    if lsof -i :4723 >/dev/null 2>&1; then
        echo "Appium server running on port 4723 (started in ${i}s)"
        exit 0
    fi
    sleep 1
done

echo "ERROR: Appium failed to start within 30 seconds. Log contents:"
cat /tmp/appium.log
exit 1
