#!/bin/bash
# embed.sh program: from the release bundle phase, before the app links. compiles
#   main.jsbundle into the program the link places in the app's __TEXT,__bun, and
#   leaves the marker that tells the app to run it
# embed.sh identity: after the app links. gives that program the app's identity
set -euo pipefail
: "${ONE_BUN_ENGINE_DIR:?the bun engine pod sets ONE_BUN_ENGINE_DIR}"
HERE=$(cd "$(dirname "$0")" && pwd)
ENGINE="$ONE_BUN_ENGINE_DIR/ios/$PLATFORM_NAME/BunEngine.o"
WORK="$DERIVED_FILE_DIR/one-bun"
APP="$TARGET_BUILD_DIR/$EXECUTABLE_PATH"
FLAGS=()
[ "$PLATFORM_NAME" = iphoneos ] && FLAGS=(--aot-huge-heap)
mkdir -p "$WORK/template" "$WORK/compiled" "$WORK/identity"

# bun compile writes a program for an executable holding the runtime. the
# template is keyed on the exact engine and link flags, since switching to an
# older engine release must relink it too. bun compile refuses an executable
# without a code signature, and only simulator links sign by default
LINK_FLAGS=(-lc++ -Wl,-adhoc_codesign -target "arm64-apple-ios$IPHONEOS_DEPLOYMENT_TARGET${LLVM_TARGET_TRIPLE_SUFFIX:-}")
ENGINE_KEY="$ENGINE $(stat -f '%m %z' "$ENGINE") ${LINK_FLAGS[*]}"
if [ ! -f "$WORK/template.linked" ] || [ "$(cat "$WORK/template.engine" 2>/dev/null)" != "$ENGINE_KEY" ]; then
  echo 'int main(void) { return 0; }' | xcrun --sdk "$PLATFORM_NAME" clang -x c - -x none "$ENGINE" \
    "${LINK_FLAGS[@]}" -o "$WORK/template.linked"
  printf '%s' "$ENGINE_KEY" > "$WORK/template.engine"
fi
compile() { # <entry> <template> <program out>
  local name
  name=$(basename "$2")
  # react native polyfills replace built-in members (intl's Number.prototype.toLocaleString),
  # so built-ins the program writes stay replaceable. stack frames name the entry as bun was
  # given it, so it compiles from its own directory: ./main.jsbundle:<line>:<col>, which a
  # main.jsbundle source map resolves. bun would read .jsbundle as typescript without the loader
  (cd "$(dirname "$1")" && BUN_AOT_REPLACE_WRITTEN=1 "$ONE_BUN_ENGINE_DIR/bun" compile "$(basename "$1")" --loader .jsbundle:js \
    ${FLAGS[@]+"${FLAGS[@]}"} --compile-executable-path="$2" --outfile="$WORK/compiled/$name")
  python3 "$HERE/program.py" extract "$WORK/compiled/$name" "$3"
  rm -f "$WORK/compiled/$name"
}

case "${1:-}" in
  program)
    BUNDLE="$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/main.jsbundle"
    MARKER='/*bun-compiled-entry*/'
    if [ ! -f "$BUNDLE" ]; then
      echo "error: [one] bun engine: no main.jsbundle to compile" >&2
      exit 1
    fi
    # bun records the executable's name in the program
    python3 "$HERE/program.py" template "$WORK/template.linked" "$WORK/template/$EXECUTABLE_NAME"
    cp "$BUNDLE" "$WORK/main.jsbundle"
    compile "$WORK/main.jsbundle" "$WORK/template/$EXECUTABLE_NAME" "$WORK/program.new"
    # an unchanged program keeps its date, so the link only reruns for a new one
    cmp -s "$WORK/program.new" "$DERIVED_FILE_DIR/one-bun-program" || mv "$WORK/program.new" "$DERIVED_FILE_DIR/one-bun-program"
    printf '%s' "$MARKER" > "$BUNDLE"
    ;;
  identity)
    python3 "$HERE/program.py" template "$WORK/template.linked" "$WORK/identity/$EXECUTABLE_NAME" "$APP"
    echo '0' > "$WORK/identity.js"
    compile "$WORK/identity.js" "$WORK/identity/$EXECUTABLE_NAME" "$WORK/identity.program"
    python3 "$HERE/program.py" identity "$APP" "$WORK/identity.program"
    if [ "${CODE_SIGNING_ALLOWED:-YES}" = NO ]; then
      codesign --force --sign - "$APP"
    fi
    ;;
  *)
    echo "usage: embed.sh program|identity" >&2
    exit 1
    ;;
esac
