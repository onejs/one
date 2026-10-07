import errno
import pathlib
import select
import subprocess
import sys


pid = int(sys.argv[1])
root = pathlib.Path(sys.argv[2])
expected = "one-native-android-runtime-system-copy-content-pro64.sh"
process = subprocess.run(
    ["ps", "-p", str(pid), "-o", "args="], capture_output=True, text=True, check=False
)
if process.returncode == 0:
    if expected not in process.stdout:
        sys.exit("refusing to wait on a process outside this proof")
    queue = select.kqueue()
    try:
        event = select.kevent(
            pid,
            filter=select.KQ_FILTER_PROC,
            flags=select.KQ_EV_ADD | select.KQ_EV_ONESHOT,
            fflags=select.KQ_NOTE_EXIT,
        )
        try:
            events = queue.control([event], 1, 2700)
        except ProcessLookupError:
            events = []
        if events and events[0].flags & select.KQ_EV_ERROR:
            if events[0].data != errno.ESRCH:
                sys.exit(f"process watcher failed: errno {events[0].data}")
        elif not events and process.returncode == 0:
            # an exited process has no ps row; a live row means the deadline expired.
            current = subprocess.run(["ps", "-p", str(pid)], capture_output=True)
            if current.returncode == 0:
                sys.exit("owned runtime did not exit within 45 minutes")
    finally:
        queue.close()

log = (root / "system.log").read_text()
print("\n".join(line for line in log.splitlines() if line.startswith(("PASS ", "FAIL "))))
if not (root / "worktree-status.txt").exists():
    sys.exit("runtime exited without its final receipt")
print("source:", (root / "source.txt").read_text().strip())
sys.exit(0 if "PASS one-native-android system " in log else 1)
