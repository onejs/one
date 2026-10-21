#!/bin/bash
# Embeds hermesvm.framework from the extracted Hermes build into the app.
set -euo pipefail

src="$1/hermesvm.framework"
dst="$2/hermesvm.framework"

rm -rf "$dst"
cp -R "$src" "$dst"
codesign --force --sign - "$dst"
