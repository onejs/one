#!/bin/bash
# Bundles an app's JavaScript for the `linux` JS platform with One, then compiles
# it to Hermes bytecode, main.jsbundle, which the host maps from disk. One needs
# node, so the first form runs where node is; the bytecode step needs the Linux
# hermesc, so it takes a second form that runs where hermesc is (the VM has no
# node):
#   bundle-js.sh js <app dir> <out.js>             one build --platform linux
#   bundle-js.sh bytecode <hermesc> <js> <out>     compile to main.jsbundle
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"

case "${1:-}" in
  js)
    out="$(cd "$(dirname "$3")" && pwd)/$(basename "$3")"
    cd "$2"
    node "$here/../../dist/esm/cli.mjs" build --platform linux
    cp dist/linux.js "$out"
    ;;
  bytecode)
    "$2" -emit-binary -max-diagnostic-width=80 -O -out "$4" "$3"
    ;;
  *)
    echo "usage: bundle-js.sh js <app dir> <out.js> | bytecode <hermesc> <js> <out>" >&2
    exit 1
    ;;
esac
