#!/bin/bash
# Packages a built One Linux app as a .deb or a Flatpak bundle. The app's
# dist/ comes from `one build --platform linux` (bundle-js.sh js); everything
# else is the packaged core from prepare-core.sh, so this runs on Linux with no
# node. The package holds one private directory: one-linux, libhermesvm.so,
# main.jsbundle and assets/, plus a launcher and a desktop entry.
#   RN_ROOT               node_modules/react-native
#   usage                 package-app.sh <deb|flatpak> <app dir> <out dir>
#   ONE_LINUX_APP_NAME    package name (default: name in the app's package.json)
#   ONE_LINUX_APP_ID      reverse dns id (default: dev.onestack.<name>)
#   ONE_LINUX_APP_TITLE   desktop entry name (default: the package name)
#   ONE_LINUX_FLATPAK_RUNTIME  GNOME runtime version (default 51)
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
source "$here/cache.sh"

format="${1:?usage: package-app.sh <deb|flatpak> <app dir> <out dir>}"
app="$(cd "${2:?}" && pwd)"
out="$(mkdir -p "${3:?}" && cd "${3}" && pwd)"

field() { sed -n "s/^  \"$1\": \"\\(.*\\)\",\\?\$/\\1/p" "$app/package.json" | head -n 1; }
name="${ONE_LINUX_APP_NAME:-$(field name)}"
version="$(field version)"
id="${ONE_LINUX_APP_ID:-dev.onestack.$(echo "$name" | tr -cd 'A-Za-z0-9')}"
title="${ONE_LINUX_APP_TITLE:-$name}"
runtime="${ONE_LINUX_FLATPAK_RUNTIME:-51}"

core="$cache/core-runtime-$(core_key release)"
"$here/prepare-core.sh" "$core" release

work="$(mktemp -d "$cache/package-app.XXXXXX")"
trap 'rm -rf "$work"' EXIT

# the private directory every format installs as is
payload="$work/payload"
mkdir -p "$payload"
cp "$core/one-linux" "$core/libhermesvm.so" "$payload/"
"$core/hermesc" -emit-binary -max-diagnostic-width=80 -O -out "$payload/main.jsbundle" "$app/dist/linux.js"
[ -d "$app/dist/assets" ] && cp -R "$app/dist/assets" "$payload/assets"

# the host names its gtk application after this, which is what the compositor
# matches the desktop entry's StartupWMClass against
launcher() {
  printf '#!/bin/sh\nexport ONE_LINUX_APP_ID=%s%s\nexec %s/one-linux "$@"\n' "$id" "${2:-}" "$1"
}
desktop() {
  printf '[Desktop Entry]\nType=Application\nName=%s\nExec=%s\nStartupWMClass=%s\nCategories=Utility;\nTerminal=false\n' "$title" "$1" "$id"
}

case "$format" in
  deb)
    pkg="$(echo "$name" | tr 'A-Z_' 'a-z-' | tr -cd 'a-z0-9+.-')"
    root="$work/deb"
    lib="$root/usr/lib/$pkg"
    mkdir -p "$lib" "$root/usr/bin" "$root/usr/share/applications" "$root/DEBIAN"
    cp -R "$payload/." "$lib/"
    launcher "/usr/lib/$pkg" > "$root/usr/bin/$pkg"
    chmod 755 "$root/usr/bin/$pkg"
    desktop "$pkg" > "$root/usr/share/applications/$id.desktop"

    # dependencies come from the host's own imports, the way debhelper finds them
    mkdir -p "$work/debian"
    echo "Source: $pkg" > "$work/debian/control"
    (cd "$work" && dpkg-shlibdeps -O -l"$lib" -e"$lib/one-linux" -e"$lib/libhermesvm.so" 2>/dev/null | sed -n 's/^shlibs:Depends=//p') > "$work/depends"

    cat > "$root/DEBIAN/control" <<CONTROL
Package: $pkg
Version: $version
Architecture: $(dpkg --print-architecture)
Maintainer: One <https://onestack.dev>
Installed-Size: $(du -sk "$root" | cut -f1)
Depends: $(cat "$work/depends")
Description: $title
 A One app running on the Linux native target.
CONTROL
    fakeroot dpkg-deb --build --root-owner-group "$root" "$out/${pkg}_${version}_$(dpkg --print-architecture).deb" >/dev/null
    ls "$out/${pkg}_${version}_$(dpkg --print-architecture).deb"
    ;;

  flatpak)
    pkg="$(echo "$name" | tr 'A-Z_' 'a-z-' | tr -cd 'a-z0-9-')"
    stage="$work/flatpak"
    mkdir -p "$stage/lib/$id" "$stage/bin" "$stage/share/applications"
    cp -R "$payload/." "$stage/lib/$id/"
    launcher "/app/lib/$id" > "$stage/bin/$pkg"
    chmod 755 "$stage/bin/$pkg"
    desktop "$pkg" > "$stage/share/applications/$id.desktop"

    cat > "$work/$id.json" <<MANIFEST
{
  "app-id": "$id",
  "runtime": "org.gnome.Platform",
  "runtime-version": "$runtime",
  "sdk": "org.gnome.Sdk",
  "command": "$pkg",
  "finish-args": ["--socket=wayland", "--socket=fallback-x11", "--share=ipc", "--device=dri", "--share=network"],
  "modules": [
    {
      "name": "$pkg",
      "buildsystem": "simple",
      "build-commands": ["cp -R . /app/"],
      "sources": [{ "type": "dir", "path": "$stage" }]
    }
  ]
}
MANIFEST
    flatpak-builder --user --force-clean --state-dir="$work/state" --disable-rofiles-fuse --install-deps-from=flathub \
      --repo="$work/repo" "$work/build" "$work/$id.json" >&2
    flatpak build-bundle "$work/repo" "$out/$id.flatpak" "$id" --runtime-repo=https://dl.flathub.org/repo/flathub.flatpakrepo
    ls "$out/$id.flatpak"
    ;;

  *)
    echo "usage: package-app.sh <deb|flatpak> <app dir> <out dir>" >&2
    exit 1
    ;;
esac
