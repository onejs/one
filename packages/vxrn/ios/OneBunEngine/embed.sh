#!/bin/bash
# run from the release bundle phase: compiles main.jsbundle into the app's Bun.framework
# and leaves the marker that tells the app to run it
set -euo pipefail
: "${ONE_BUN_ENGINE_DIR:?the bun engine pod sets ONE_BUN_ENGINE_DIR}"
RESOURCES="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
BUNDLE="$RESOURCES/main.jsbundle"
FRAMEWORKS="$TARGET_BUILD_DIR/$FRAMEWORKS_FOLDER_PATH"
TEMPLATE="$ONE_BUN_ENGINE_DIR/ios/$PLATFORM_NAME"
MARKER='/*bun-compiled-entry*/'
HERE=$(cd "$(dirname "$0")" && pwd)

if [ ! -f "$BUNDLE" ]; then
  echo "error: [one] bun engine: no main.jsbundle to compile" >&2
  exit 1
fi
FLAGS=()
[ "$PLATFORM_NAME" = iphoneos ] && FLAGS=(--aot-huge-heap)

mkdir -p "$FRAMEWORKS"
rm -rf "$FRAMEWORKS/Bun.framework" "$FRAMEWORKS/BunCompat.framework"
cp -R "$TEMPLATE/BunCompat.framework" "$FRAMEWORKS/"
cp -R "$TEMPLATE/Bun.framework" "$FRAMEWORKS/"
BIN="$FRAMEWORKS/Bun.framework/Bun"
python3 "$HERE/dylib-id.py" "$BIN" hide
# bun picks its parser from the extension and reads .jsbundle as typescript
ENTRY="$DERIVED_FILE_DIR/one-bun-entry.js"
mkdir -p "$DERIVED_FILE_DIR"
cp "$BUNDLE" "$ENTRY"
"$ONE_BUN_ENGINE_DIR/bun" compile "$ENTRY" ${FLAGS[@]+"${FLAGS[@]}"} \
  --compile-executable-path="$BIN" --outfile="$BIN.compiled"
mv "$BIN.compiled" "$BIN"
python3 "$HERE/dylib-id.py" "$BIN" restore
printf '%s' "$MARKER" > "$BUNDLE"

IDENTITY="${EXPANDED_CODE_SIGN_IDENTITY:--}"
[ "${CODE_SIGNING_ALLOWED:-YES}" = NO ] && IDENTITY=-
for framework in BunCompat Bun; do
  codesign --force --sign "$IDENTITY" --timestamp=none "$FRAMEWORKS/$framework.framework"
done
