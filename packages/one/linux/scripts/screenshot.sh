#!/bin/bash
# runs the Linux host under headless sway and captures the first frame with RN text.
# $1 executable, $2 output png, $3 window size (default 800x600), $4 optional bundle
set -euo pipefail

exe="$1"
png="$2"
bundle="${4:-}"
work="$(mktemp -d)"
export XDG_RUNTIME_DIR="$work"
export WLR_BACKENDS=headless WLR_LIBINPUT_NO_DEVICES=1 WLR_RENDERER=pixman
export GDK_BACKEND=wayland GSK_RENDERER=cairo ONE_LINUX_STARTUP_LOG=1

# sway runs startup commands after its Wayland socket is ready.
mkfifo "$work/ready"
exec 3<>"$work/ready"
cat > "$work/config" <<CONFIG
output * mode ${3:-800x600}
exec printf '%s\\n' "\$WAYLAND_DISPLAY" > "$work/ready"
CONFIG
sway -c "$work/config" >"$png.sway.log" 2>&1 &
sway_pid=$!
trap 'kill "$sway_pid" 2>/dev/null || true; wait "$sway_pid" 2>/dev/null || true; rm -rf "$work"' EXIT
read -r -t 10 WAYLAND_DISPLAY <&3
export WAYLAND_DISPLAY
exec 3>&-

python3 - "$exe" "$png" "$bundle" <<'PYTHON'
import os
import selectors
import subprocess
import sys
import time

exe, png, bundle = sys.argv[1:]
app = subprocess.Popen([exe] + ([bundle] if bundle else []), stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
try:
    selector = selectors.DefaultSelector()
    selector.register(app.stdout, selectors.EVENT_READ)
    deadline = time.monotonic() + 30
    output = b''
    with open(png + '.app.log', 'wb') as log:
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0 or not selector.select(remaining):
                raise RuntimeError('no frame with RN text within 30 seconds')
            chunk = os.read(app.stdout.fileno(), 65536)
            if not chunk:
                raise RuntimeError(f'host exited before content paint: {app.wait()}')
            log.write(chunk)
            log.flush()
            sys.stdout.buffer.write(chunk)
            sys.stdout.buffer.flush()
            output += chunk
            if b'first frame with RN text painted\n' in output:
                if app.poll() is not None:
                    raise RuntimeError('host exited at content paint')
                subprocess.run(['grim', png], check=True)
                break
finally:
    app.terminate()
    try:
        app.wait(timeout=5)
    except subprocess.TimeoutExpired:
        app.kill()
        app.wait()
PYTHON
