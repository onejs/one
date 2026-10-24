#!/bin/bash
# Bundles the Linux proof app's JavaScript with Metro, then compiles it to Hermes
# bytecode, main.jsbundle, which the host maps from disk. Metro needs node, so
# this runs where node is; the bytecode step needs the Linux hermesc, so it takes
# a second form that runs where hermesc is (the VM has no node):
#   bundle-js.sh js <node_modules> <out.js>        bundle for ios, the contract
#                                                  the host implements until a
#                                                  `linux` JS platform exists
#   bundle-js.sh bytecode <hermesc> <js> <out>     compile to main.jsbundle
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"

case "${1:-}" in
  js)
    modules="$2"
    out="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"
    cd "$here/../app"
    ONE_NODE_MODULES="$modules" node "$modules/.bin/metro" build index.js \
      --platform ios --dev false --minify --out "$out"
    ;;
  bytecode)
    "$2" -emit-binary -max-diagnostic-width=80 -O -out "$4" "$3"
    ;;
  *)
    echo "usage: bundle-js.sh js <node_modules> <out.js> | bytecode <hermesc> <js> <out>" >&2
    exit 1
    ;;
esac
