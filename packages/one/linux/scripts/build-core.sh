#!/bin/bash
# Builds the Linux React Native C++ core and the headless smoke binary for the
# installed react-native: third party sources, their build, Hermes and the core,
# each cached per react-native version in the user cache.
#   RN_ROOT  node_modules/react-native
#   $1       debug (default) or release
# Prints the build directory; run $dir/one-linux-smoke <bytecode> from there.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
source "$here/cache.sh"

config="${1:-debug}"
case "$config" in
  debug) build_type=Debug ;;
  release) build_type=Release ;;
  *) echo "usage: build-core.sh [debug|release]" >&2; exit 1 ;;
esac

# clang 18 is the compiler the core was validated with
export CC="${CC:-clang}" CXX="${CXX:-clang++}"

rn="$(rn_version)"
hermes_version="$(sed -n 's/^HERMES_VERSION_NAME=//p' "$RN_ROOT/sdks/hermes-engine/version.properties")"
sources="$cache/third-party/$rn"
deps="$cache/deps-$rn-$config-$arch"
hermes="$cache/hermes-$hermes_version-$config"
core="$cache/core-$rn-$config-$arch"

"$here/prepare-deps.sh" "$sources"
"$here/prepare-hermes.sh" "$hermes" "$config"

cmake -G Ninja -S "$here/../cpp/deps" -B "$deps" \
  -DCMAKE_BUILD_TYPE="$build_type" \
  -DTP_ROOT="$sources"
cmake --build "$deps" -j "$cores"

cmake -G Ninja -S "$here/../cpp" -B "$core" \
  -DCMAKE_BUILD_TYPE="$build_type" \
  -DRN_ROOT="$RN_ROOT" \
  -DHERMES_ROOT="$hermes/destroot" \
  -DDEPS_CMAKE="$deps/OneLinuxDeps.cmake"
cmake --build "$core" -j "$cores"

echo "$core"
