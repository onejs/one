#!/bin/bash
# Builds libOneMacosCore.a (React Native's C++ core plus the One host) for the
# installed react-native. Runs as an Xcode pre build phase and by hand.
#   RN_ROOT      node_modules/react-native
#   ONE_MACOS    packages/one/macos
#   CORE_OUT     build directory, holds libOneMacosCore.a and the deps
set -euo pipefail

: "${RN_ROOT:?}" "${ONE_MACOS:?}" "${CORE_OUT:?}"
config="${CORE_CONFIG:-Debug}"
deps="$CORE_OUT/deps"

nitro_root="$(dirname "$RN_ROOT")/react-native-nitro-modules"

lower="$(echo "$config" | tr '[:upper:]' '[:lower:]')"
RN_ROOT="$RN_ROOT" "$(dirname "$0")/prepare-deps.sh" "$deps" "$lower"
RN_ROOT="$RN_ROOT" "$(dirname "$0")/prepare-hermes.sh" "$CORE_OUT/hermes" "$lower"

cmake -G Ninja -S "$ONE_MACOS/cpp" -B "$CORE_OUT/build" \
  -DCMAKE_BUILD_TYPE="$config" \
  -DCMAKE_OSX_ARCHITECTURES=arm64 \
  -DCMAKE_OSX_DEPLOYMENT_TARGET=14.0 \
  -DRN_ROOT="$RN_ROOT" \
  -DNITRO_ROOT="$nitro_root" \
  -DOPSQLITE_ROOT="$(dirname "$RN_ROOT")/@op-engineering/op-sqlite" \
  -DWORKLETS_ROOT="$(dirname "$RN_ROOT")/react-native-worklets" \
  -DHERMES_ROOT="$CORE_OUT/hermes/destroot" \
  -DRN_DEPS_ROOT="$deps/packages/react-native/third-party" >/dev/null
ninja -C "$CORE_OUT/build"
