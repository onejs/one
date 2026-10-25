#!/bin/bash
# builds static PIC ICU for Hermes' shared library, cached per architecture.
# Ubuntu's libicu-dev static archives are not compiled for shared-library use.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
source "$here/cache.sh"

out="$1"
version=74.2
key="$version-pic-$arch"
stamp="$out/.icu-version"
if [ -f "$out/destroot/lib/libicuuc.a" ] && [ "$(cat "$stamp" 2>/dev/null)" = "$key" ]; then
  exit 0
fi

tarball="$cache/downloads/icu4c-${version//./_}-src.tgz"
mkdir -p "$cache/downloads"
if [ ! -f "$tarball" ]; then
  curl -fsSL "https://github.com/unicode-org/icu/releases/download/release-${version//./-}/icu4c-${version//./_}-src.tgz" -o "$tarball.part"
  mv "$tarball.part" "$tarball"
fi
echo "68db082212a96d6f53e35d60f47d38b962e9f9d207a74cfac78029ae8ff5e08c  $tarball" | sha256sum -c -

src="$cache/src/icu-$version"
if [ ! -d "$src" ]; then
  mkdir -p "$src.part"
  tar -xzf "$tarball" -C "$src.part" --strip-components=1
  mv "$src.part" "$src"
fi

mkdir -p "$out/build"
cd "$out/build"
CFLAGS="${CFLAGS:-} -fPIC" CXXFLAGS="${CXXFLAGS:-} -fPIC" \
  "$src/source/configure" --prefix="$out/destroot" --libdir="$out/destroot/lib" \
    --disable-shared --enable-static --with-data-packaging=static \
    --disable-tests --disable-samples --disable-extras
make -j "$cores"
make install
echo "$key" > "$stamp"
