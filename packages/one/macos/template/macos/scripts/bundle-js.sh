#!/bin/bash
# Release builds embed the app's JavaScript as Hermes bytecode, main.jsbundle,
# with its assets beside it, as the iOS bundle phase does. Debug builds load
# from the dev server instead.
#   $1  app root, the directory holding package.json
#   $2  node_modules/react-native
#   $3  hermesc from the extracted Hermes build the app links
#   $4  the built app's resources directory
set -eo pipefail

if [ "${CONFIGURATION:-Debug}" = "Debug" ]; then
  exit 0
fi

root="$1"
rn_root="$2"
hermesc="$3"
resources="$4"
mkdir -p "$resources"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# shellcheck source=/dev/null
source "$rn_root/scripts/node-binary.sh"

cd "$root"
"$NODE_BINARY" "$rn_root/cli.js" bundle --entry-file index.js --platform macos --dev false --minify true \
  --bundle-output "$work/main.js" --assets-dest "$resources"
"$hermesc" -emit-binary -max-diagnostic-width=80 -O -out "$resources/main.jsbundle" "$work/main.js"
