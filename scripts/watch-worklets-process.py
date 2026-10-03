#!/usr/bin/env python3
"""Wake a detached tm wait when the measured command exits on macOS."""
import os
import select
import sys

if len(sys.argv) != 2:
    raise SystemExit('usage: watch-worklets-process.py <pid>')
pid = int(sys.argv[1])
queue = select.kqueue()
try:
    try:
        queue.control([select.kevent(
            pid, filter=select.KQ_FILTER_PROC,
            flags=select.KQ_EV_ADD | select.KQ_EV_ONESHOT,
            fflags=select.KQ_NOTE_EXIT,
        )], 0, 0)
        os.kill(pid, 0)
    except ProcessLookupError:
        print(f'benchmark process {pid} already ended; inspect receipts')
        raise SystemExit(0)
    print(f'watching benchmark process {pid}', flush=True)
    queue.control(None, 1, None)
    print(f'benchmark process {pid} ended; inspect receipts and logs')
finally:
    queue.close()
