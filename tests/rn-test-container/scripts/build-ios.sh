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

# Generate fingerprint using @expo/fingerprint for accurate native dependency tracking
generate_fingerprint() {
  local config=$1

  # Get "one" package version - must be included since it affects prebuild output
  # @expo/fingerprint won't track workspace packages, so we add this manually
  #
  # Smart version detection for release builds:
  # If the only change to packages/one/package.json is a version bump (release scenario),
  # use the OLD (committed) version so we can reuse the cache from before the bump.
  local one_version=""
  local one_pkg="../../packages/one/package.json"

  # Check if package.json has uncommitted changes
  if git -C ../.. diff --quiet -- packages/one/package.json 2>/dev/null; then
    # No changes, use current version
    one_version=$(cat "$one_pkg" 2>/dev/null | grep '"version"' | head -1 || echo "")
  else
    # Has changes - check if it's ONLY the version field that changed
    local diff_lines=$(git -C ../.. diff --no-color -- packages/one/package.json 2>/dev/null | grep "^[+-]" | grep -v "^[+-][+-][+-]" | grep -v '"version"' | wc -l | tr -d ' ')
    if [ "$diff_lines" = "0" ]; then
      # Only version changed - use the OLD (committed) version for cache compatibility
      echo "Detected version-only change, using committed version for cache key" >&2
      one_version=$(git -C ../.. show HEAD:packages/one/package.json 2>/dev/null | grep '"version"' | head -1 || echo "")
    else
      # Other changes too - use current version
      one_version=$(cat "$one_pkg" 2>/dev/null | grep '"version"' | head -1 || echo "")
    fi
  fi

  # Use @expo/fingerprint for accurate native dependency detection
  # This properly tracks changes to native modules, Podfile.lock, etc.
  # The output is JSON with a final "hash" field - we use jq to extract just that one
  local expo_fingerprint=""
  expo_fingerprint=$(npx --yes @expo/fingerprint fingerprint:generate --platform ios 2>/dev/null | jq -r '.hash' 2>/dev/null || echo "")

  if [ -n "$expo_fingerprint" ]; then
    # Combine expo fingerprint with config AND one version for final hash
    echo "${expo_fingerprint}-${config}-${one_version}" | shasum -a 256 | cut -d' ' -f1
  else
    # Fallback to manual hashing if @expo/fingerprint fails
    echo "Warning: @expo/fingerprint failed, falling back to manual hashing" >&2
    local hash_input=""
    hash_input+=$(cat package.json 2>/dev/null || echo "")
    hash_input+=$(cat app.json 2>/dev/null || echo "")
    hash_input+=$(cat ios/Podfile 2>/dev/null || echo "")
    hash_input+=$(cat ios/Podfile.lock 2>/dev/null || echo "")
    hash_input+="$one_version"
    hash_input+="$config"
    if [ -d "ios/RNTestContainer" ]; then
      hash_input+=$(find ios/RNTestContainer -type f \( -name "*.m" -o -name "*.mm" -o -name "*.h" -o -name "*.swift" -o -name "*.plist" -o -name "*.storyboard" \) -exec cat {} \; 2>/dev/null || echo "")
    fi
    echo "$hash_input" | shasum -a 256 | cut -d' ' -f1
  fi
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

# Run prebuild and pod install with precompiled RN dependencies (~8x faster)
yarn prebuild:native --platform ios

# Enable precompiled React Native builds (RN 0.81+) and ccache for faster builds
# RCT_USE_RN_DEP=1 - Use precompiled ReactNativeDependencies.xcframework
# RCT_USE_PREBUILT_RNCORE=1 - Use precompiled RN core
export RCT_USE_RN_DEP=1
export RCT_USE_PREBUILT_RNCORE=1
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
