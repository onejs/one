# Android system Copy and Print proof

RAN: the Pixel 8 Android17/API37 r06 passes the saved Share and Print
checkpoints from runtime source `605dde041`. The native APK is unchanged
from `4d7be9f17`, SHA256
`fc7e029c01282c976d4f882f52b5d4e8ebbd7202f266507f2c37e4c3da304784`.
[Source hashes](source.json) and the [exact run setup](run.sh) identify the
fixture, runner, native implementations and installed APK.

The earlier system Copy probe returned `{"completed":true}`. The fixture
incorrectly required an activity name, although the public result makes it
optional and Android's built-in Copy has no selected component. The repaired
probe selects the system `Copy text` action, seeds a different clipboard
value, then requires completion, an absent activity type and the exact
shared text plus URL on the clipboard. File cancellation, busy rejection
and all four input errors pass. The iOS activity assertion remains intact.

The Print checkpoint previously waited for fixture status behind the
system window. It now requires the rendered, checked one-page PDF, Cancel
button and actual PrintSpooler focus. Cancellation reports completed=false;
busy, URI, missing-file, malformed-PDF and argument error controls pass.
The assertion deadlines remain unchanged.

The committed XML and status receipts contain those passing checkpoints.
The three full captures are 1080x2400; the Copy detail is a 1080x920 native
pixel crop. All WebPs are quality 90 without resizing, inspected at original
resolution and shared with Nate.

The outer `w-7c07` wait lost the peer transcript connection after Share;
the remote execution `r64549` continued. Saved artifacts confirm Print's
passing checks. The recovered run passes 35 checkpoints, including Print unavailability
and Quick Actions registration, warm/cold delivery and clearing, then fails
AppIcon switching. Cleanup stops the owned emulator and Metro; the peer
worktree is clean. The macOS process-exit watcher waits once on that owned
execution through kqueue, then reads its persisted result. It does not poll. Run on
the emulator's Mac with the owned script PID and evidence root:

```sh
python3 wait-runtime.macos.py <pid> <evidence-root>
```

Raw logs, Android bundle, APK and every capture remain under primary
`tests/native-features/evidence/android-restart-p66065/`. This proof covers
Copy and Print cancellation, not physical printer output or all native APIs.
