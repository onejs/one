#!/bin/bash
# Runs the Linux host under a headless sway compositor, waits for the first
# painted frame, captures the window with grim and prints the startup timeline.
#   $1  one-linux executable (main.jsbundle sits beside it, or pass $4)
#   $2  output png
#   $3  window size, default 800x600 (the sway output is larger)
#   $4  bundle path, optional
set -euo pipefail

exe="$1"
png="$2"
bundle="${4:-}"
work="$(mktemp -d)"
export XDG_RUNTIME_DIR="$work"
export WLR_BACKENDS=headless WLR_LIBINPUT_NO_DEVICES=1 WLR_RENDERER=pixman
export GDK_BACKEND=wayland ONE_LINUX_STARTUP_LOG=1

sway >"$work/sway.log" 2>&1 &
sway_pid=$!
trap 'kill $app_pid $sway_pid 2>/dev/null || true; rm -rf "$work"' EXIT
timeout 10 sh -c "until ls '$work'/wayland-* >/dev/null 2>&1; do :; done"
export WAYLAND_DISPLAY="$(basename "$(ls "$work"/wayland-[0-9] | head -1)")"

"$exe" $bundle >"$work/app.log" 2>&1 &
app_pid=$!
timeout 20 sh -c "tail -f '$work/app.log' | grep -m1 'first frame'" >/dev/null
sleep "${ONE_LINUX_SETTLE:-0}"
grim "$png"
cat "$work/app.log"
