#!/bin/bash
# Builds the packaged core from source and tars it as the prebuilt a release
# attaches: one-linux-core-<one>-rn<react-native>-<config>-<arch>.tar.gz in $2.
# CI runs this once per architecture; prepare-core.sh downloads the result.
#   RN_ROOT  node_modules/react-native
#   $1       release (default) or debug
#   $2       output directory (default: the current directory)
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
source "$here/cache.sh"

config="${1:-release}"
dest="$(mkdir -p "${2:-.}" && cd "${2:-.}" && pwd)"
name="one-linux-core-$(core_key "$config").tar.gz"
work="$cache/package-core-$config"

ONE_LINUX_CORE_FROM_SOURCE=1 "$here/prepare-core.sh" "$work" "$config"
tar -czf "$dest/$name" -C "$work" one-linux libhermesvm.so hermesc
echo "$dest/$name"
