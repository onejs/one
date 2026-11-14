#!/bin/bash
# run from the release bundle phase: compiles main.jsbundle into the app's BunCompat.framework
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

mkdir -p "$FRAMEWORKS" "$DERIVED_FILE_DIR"
rm -rf "$FRAMEWORKS/Bun.framework" "$FRAMEWORKS/BunCompat.framework"
cp -R "$TEMPLATE/Bun.framework" "$TEMPLATE/BunCompat.framework" "$FRAMEWORKS/"
# bun picks its parser from the extension and reads .jsbundle as typescript
ENTRY="$DERIVED_FILE_DIR/one-bun-entry.js"
cp "$BUNDLE" "$ENTRY"
python3 "$HERE/program.py" template "$TEMPLATE/Bun.framework/Bun" "$DERIVED_FILE_DIR/one-bun-runtime"
"$ONE_BUN_ENGINE_DIR/bun" compile "$ENTRY" ${FLAGS[@]+"${FLAGS[@]}"} \
  --compile-executable-path="$DERIVED_FILE_DIR/one-bun-runtime" --outfile="$DERIVED_FILE_DIR/one-bun-compiled"
python3 "$HERE/program.py" extract "$DERIVED_FILE_DIR/one-bun-compiled" "$DERIVED_FILE_DIR/one-bun-program"
# an App Store binary may have one executable segment, so the program goes into
# the __TEXT of BunCompat, where the runtime finds it
xcrun --sdk "$PLATFORM_NAME" clang -target "arm64-apple-ios$IPHONEOS_DEPLOYMENT_TARGET${LLVM_TARGET_TRIPLE_SUFFIX:-}" \
  -dynamiclib "$HERE/bun-compat.c" -install_name @rpath/BunCompat.framework/BunCompat \
  -Wl,-sectcreate,__TEXT,__bun,"$DERIVED_FILE_DIR/one-bun-program" -Wl,-sectalign,__TEXT,__bun,0x4000 \
  -o "$FRAMEWORKS/BunCompat.framework/BunCompat"
printf '%s' "$MARKER" > "$BUNDLE"

IDENTITY="${EXPANDED_CODE_SIGN_IDENTITY:--}"
[ "${CODE_SIGNING_ALLOWED:-YES}" = NO ] && IDENTITY=-
for framework in BunCompat Bun; do
  codesign --force --sign "$IDENTITY" --timestamp=none "$FRAMEWORKS/$framework.framework"
done
