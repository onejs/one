#!/bin/bash
# Builds Hermes for Linux from source at the revision the installed
# react-native pins (the same HERMES_VERSION_NAME the macOS build downloads as a
# prebuilt tarball) into $1/destroot: include/{hermes,jsi}, lib/libhermesvm.so
# and bin/hermesc. Reuses the destroot while the version and config match.
#   RN_ROOT  node_modules/react-native
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
source "$here/cache.sh"

out="$1"
config="${2:-debug}"
version="$(sed -n 's/^HERMES_VERSION_NAME=//p' "$RN_ROOT/sdks/hermes-engine/version.properties")"
src="$cache/src/hermes-$version"

stamp="$out/.hermes-version"
if [ -f "$out/destroot/lib/libhermesvm.so" ] && [ "$(cat "$stamp" 2>/dev/null)" = "$version-$config-$arch" ]; then
  exit 0
fi

if [ ! -d "$src" ]; then
  mkdir -p "$cache/src"
  git clone -q --depth 1 --branch "hermes-v$version" https://github.com/facebook/hermes.git "$src.part"
  mv "$src.part" "$src"
fi

if [ "$config" = debug ]; then
  build_type=Debug
  debugger=ON
else
  build_type=Release
  debugger=OFF
fi

# the options of react-native's build-apple-framework.sh that apply here; jsi
# comes from react-native, as it does for every other platform
cmake -G Ninja -S "$src" -B "$out/build" \
  -DCMAKE_BUILD_TYPE="$build_type" \
  -DHERMES_ENABLE_DEBUGGER="$debugger" \
  -DHERMES_ENABLE_INTL=OFF \
  -DHERMES_ENABLE_TEST_SUITE=OFF \
  -DHERMES_ENABLE_LIBFUZZER=OFF \
  -DHERMES_ENABLE_FUZZILLI=OFF \
  -DHERMES_BUILD_SHARED_JSI=OFF \
  -DHERMES_RELEASE_VERSION="for RN $(rn_version)" \
  -DJSI_DIR="$RN_ROOT/ReactCommon/jsi" >/dev/null
ninja -C "$out/build" hermesvm hermesc

rm -rf "$out/destroot"
mkdir -p "$out/destroot/include/hermes/Public" "$out/destroot/include/hermes/cdp" "$out/destroot/lib" "$out/destroot/bin"
cp "$src"/API/hermes/*.h "$out/destroot/include/hermes/"
cp "$src"/API/hermes/cdp/*.h "$out/destroot/include/hermes/cdp/"
cp "$src"/public/hermes/Public/*.h "$out/destroot/include/hermes/Public/"
cp "$out/build/lib/libhermesvm.so" "$out/destroot/lib/"
cp "$out/build/bin/hermesc" "$out/destroot/bin/"
echo "$version-$config-$arch" > "$stamp"
