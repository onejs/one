#!/bin/bash
# Extracts ReactNativeDependencies for the installed react-native into $1 and
# prints nothing. The tarball comes from the ReactNative cache, then Maven.
set -euo pipefail

out="$1"
rn_root="${RN_ROOT:?set RN_ROOT to node_modules/react-native}"
version="$(node -p "require('$rn_root/package.json').version")"
config="${2:-debug}"
cache="$HOME/Library/Caches/ReactNative"
tarball="$cache/reactnative-dependencies-$version-$config.tar.gz"

if [ -d "$out/packages/react-native/third-party/ReactNativeDependencies.xcframework" ]; then
  exit 0
fi

if [ ! -f "$tarball" ]; then
  mkdir -p "$cache"
  url="https://repo1.maven.org/maven2/com/facebook/react/react-native-artifacts/$version/react-native-artifacts-$version-reactnative-dependencies-$config.tar.gz"
  curl -fsSL "$url" -o "$tarball.part"
  mv "$tarball.part" "$tarball"
fi

mkdir -p "$out"
tar -xzf "$tarball" -C "$out"
