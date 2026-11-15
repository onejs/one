#!/bin/bash
# Embeds ReactNativeDependencies into the app. The macOS slice in RN's tarball
# ships with its symlinks flattened into copies, which codesign rejects as an
# ambiguous bundle, so rebuild the versioned layout here.
set -euo pipefail

src="$1/ReactNativeDependencies.xcframework/macos-arm64_x86_64/ReactNativeDependencies.framework"
dst="$2/ReactNativeDependencies.framework"

rm -rf "$dst"
mkdir -p "$dst/Versions/A/Resources"
cp "$src/Versions/A/ReactNativeDependencies" "$dst/Versions/A/"
cp "$src/Versions/A/Resources/Info.plist" "$dst/Versions/A/Resources/"
for bundle in "$src"/*.bundle; do
  cp -R "$bundle" "$dst/Versions/A/Resources/"
done
ln -s A "$dst/Versions/Current"
ln -s Versions/Current/ReactNativeDependencies "$dst/ReactNativeDependencies"
ln -s Versions/Current/Resources "$dst/Resources"
codesign --force --sign - "$dst"
