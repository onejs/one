#!/usr/bin/env zsh
# This script prepares the required environment for running the iOS tests (such as the test container app, Appium), and then runs the tests.
set -e

cd "$(dirname "$0")/.."

# # for a clean build
# rm -r tests/rn-test-container/ios || true

tests/rn-test-container/scripts/build-ios.sh Debug
tests/rn-test-container/scripts/build-ios.sh Release

export DEV_PORT=8081 # currently we cannot dynamically set the port for the test container app, so we need to force it to be 8081

export IOS_TEST_CONTAINER_PATH_DEV="$(tests/rn-test-container/scripts/get-ios-built-app-path.sh Debug)"
export IOS_TEST_CONTAINER_PATH_PROD="$(tests/rn-test-container/scripts/get-ios-built-app-path.sh Release)"

scripts/install-and-run-appium.sh

yarn test-ios:run
