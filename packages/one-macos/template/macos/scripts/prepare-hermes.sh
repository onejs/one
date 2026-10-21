#!/bin/bash
# Extracts the Hermes build pinned by the installed react-native into $1. The
# Maven tarball ships a macOS slice of hermesvm.framework next to the headers.
set -euo pipefail

out="$1"
rn_root="${RN_ROOT:?set RN_ROOT to node_modules/react-native}"
config="${2:-debug}"
version="$(sed -n 's/^HERMES_VERSION_NAME=//p' "$rn_root/sdks/hermes-engine/version.properties")"
cache="$HOME/Library/Caches/ReactNative"
tarball="$cache/hermes-ios-$version-$config.tar.gz"

if [ -d "$out/destroot/Library/Frameworks/macosx/hermesvm.framework" ]; then
  exit 0
fi

if [ ! -f "$tarball" ]; then
  mkdir -p "$cache"
  url="https://repo1.maven.org/maven2/com/facebook/hermes/hermes-ios/$version/hermes-ios-$version-hermes-ios-$config.tar.gz"
  curl -fsSL "$url" -o "$tarball.part"
  mv "$tarball.part" "$tarball"
fi

mkdir -p "$out"
tar -xzf "$tarball" -C "$out"
