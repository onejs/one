#!/bin/bash
# Installs the packaged core into $1: one-linux, libhermesvm.so and hermesc side
# by side, which is everything an app package needs besides the app's bundle.
# It follows the macOS prepare-deps.sh and prepare-hermes.sh convention: a
# tarball per version in the user cache, a stamp file in the output and an early
# exit while the stamp matches. A tarball that cannot be downloaded means the
# core is built from source with build-core.sh and installed from there.
#   RN_ROOT                       node_modules/react-native
#   $2                            release (default) or debug
#   ONE_LINUX_CORE_URL            full url of the tarball (default: the GitHub
#                                 release asset of this One version)
#   ONE_LINUX_CORE_FROM_SOURCE=1  skip the download
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
source "$here/cache.sh"

out="$1"
config="${2:-release}"
key="$(core_key "$config")"
name="one-linux-core-$key.tar.gz"
stamp="$out/.one-linux-core-version"

if [ -x "$out/one-linux" ] && [ "$(cat "$stamp" 2>/dev/null)" = "$key" ]; then
  exit 0
fi

version="$(one_version)"
# canary versions end in a timestamp and are tagged canary<version>
if [[ "$version" =~ -[0-9]{10,}$ ]]; then tag="canary$version"; else tag="v$version"; fi
url="${ONE_LINUX_CORE_URL:-https://github.com/onejs/one/releases/download/$tag/$name}"
tarball="$cache/downloads/$name"

if [ "${ONE_LINUX_CORE_FROM_SOURCE:-}" != 1 ] && [ ! -f "$tarball" ]; then
  mkdir -p "$cache/downloads"
  echo "downloading $url" >&2
  if curl -fsSL "$url" -o "$tarball.part"; then
    mv "$tarball.part" "$tarball"
  else
    rm -f "$tarball.part"
    echo "no prebuilt core for $key, building from source" >&2
  fi
fi

rm -rf "$out"
mkdir -p "$out"
if [ "${ONE_LINUX_CORE_FROM_SOURCE:-}" != 1 ] && [ -f "$tarball" ]; then
  tar -xzf "$tarball" -C "$out"
else
  core="$("$here/build-core.sh" "$config" | tee /dev/stderr | tail -n 1)"
  cmake --install "$core" --prefix "$out" >/dev/null
  strip --strip-unneeded "$out/one-linux" "$out/libhermesvm.so" "$out/hermesc"
fi
echo "$key" > "$stamp"
