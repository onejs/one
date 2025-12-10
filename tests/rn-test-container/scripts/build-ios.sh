#!/usr/bin/env zsh
set -x
set -e
set -o pipefail

CONFIGURATION=$1

if [ -z "$CONFIGURATION" ]; then
  echo "Error: expected 'Debug' or 'Release' as the first argument"
  exit 1
fi

cd "$(dirname "$0")/.."

# Cache directory
CACHE_DIR="${HOME}/.cache/one-ios-builds"
mkdir -p "$CACHE_DIR"

# Generate fingerprint based on files that affect the iOS build
generate_fingerprint() {
  local config=$1
  # Hash package.json, app.json, Podfile (if exists), and native source files
  local hash_input=""

  # Core config files
  hash_input+=$(cat package.json 2>/dev/null || echo "")
  hash_input+=$(cat app.json 2>/dev/null || echo "")
  hash_input+=$(cat ios/Podfile 2>/dev/null || echo "")

  # Include One version since it affects prebuild output
  hash_input+=$(cat ../../packages/one/package.json 2>/dev/null | grep '"version"' || echo "")

  # Include configuration
  hash_input+="$config"

  # Include native source files if they exist
  if [ -d "ios/RNTestContainer" ]; then
    hash_input+=$(find ios/RNTestContainer -type f \( -name "*.m" -o -name "*.mm" -o -name "*.h" -o -name "*.swift" -o -name "*.plist" -o -name "*.storyboard" \) -exec cat {} \; 2>/dev/null || echo "")
  fi

  echo "$hash_input" | shasum -a 256 | cut -d' ' -f1
}

FINGERPRINT=$(generate_fingerprint "$CONFIGURATION")
CACHE_FILE="$CACHE_DIR/rn-test-container-${CONFIGURATION}-${FINGERPRINT}.tar.gz"
BUILD_DIR="ios/build-${CONFIGURATION}"
APP_PATH="$BUILD_DIR/Build/Products/${CONFIGURATION}-iphonesimulator/RNTestContainer.app"

echo "Build fingerprint: $FINGERPRINT"
echo "Cache file: $CACHE_FILE"

# Check if we have a cached build
if [ -f "$CACHE_FILE" ]; then
  echo "✓ Found cached build, extracting..."
  mkdir -p "$BUILD_DIR"
  tar -xzf "$CACHE_FILE" -C .

  # Verify the app exists after extraction
  if [ -d "$APP_PATH" ]; then
    echo "✓ Using cached build for $CONFIGURATION"
    exit 0
  else
    echo "✗ Cache extraction failed, rebuilding..."
    rm -f "$CACHE_FILE"
  fi
fi

echo "Building $CONFIGURATION (no cache hit)..."

# Clean build directories before pod install to avoid binary plist parsing errors
# React Native's post-install hook searches for Info.plist files and fails on binary plists
rm -rf ios/build-Debug ios/build-Release 2>/dev/null || true

# Run prebuild and pod install
yarn prebuild:native --platform ios
pod install --project-directory=ios

# Build with xcodebuild
xcrun xcodebuild -scheme 'RNTestContainer' \
  -workspace "ios/RNTestContainer.xcworkspace" \
  -configuration "${CONFIGURATION}" \
  -sdk 'iphonesimulator' \
  -destination 'generic/platform=iOS Simulator' \
  -archivePath "$BUILD_DIR" \
  -derivedDataPath "$BUILD_DIR" | tee xcodebuild.log | xcpretty

# Cache the build
if [ -d "$APP_PATH" ]; then
  echo "Caching build..."
  # Only cache the essential build products, not intermediate files
  tar -czf "$CACHE_FILE" \
    "$BUILD_DIR/Build/Products/${CONFIGURATION}-iphonesimulator/RNTestContainer.app" \
    "$BUILD_DIR/Build/Products/${CONFIGURATION}-iphonesimulator/RNTestContainer.app.dSYM" 2>/dev/null || \
  tar -czf "$CACHE_FILE" \
    "$BUILD_DIR/Build/Products/${CONFIGURATION}-iphonesimulator/RNTestContainer.app"

  echo "✓ Build cached to $CACHE_FILE"

  # Clean up old cache files (keep last 5)
  ls -t "$CACHE_DIR"/rn-test-container-${CONFIGURATION}-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true
fi
