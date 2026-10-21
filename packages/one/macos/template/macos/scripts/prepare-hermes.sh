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

# the extracted slice is only reusable for the Hermes build it came from
stamp="$out/.hermes-version"
if [ -d "$out/destroot/Library/Frameworks/macosx/hermesvm.framework" ] && [ "$(cat "$stamp" 2>/dev/null)" = "$version-$config" ]; then
  exit 0
fi
rm -rf "$out/destroot"

if [ ! -f "$tarball" ]; then
  mkdir -p "$cache"
  url="https://repo1.maven.org/maven2/com/facebook/hermes/hermes-ios/$version/hermes-ios-$version-hermes-ios-$config.tar.gz"
  curl -fsSL "$url" -o "$tarball.part"
  mv "$tarball.part" "$tarball"
fi

mkdir -p "$out"
tar -xzf "$tarball" -C "$out"
echo "$version-$config" > "$stamp"
