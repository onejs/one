#!/usr/bin/env python3
"""Wait for the focused server's ready receipt or its admission process to exit."""
import os
from pathlib import Path
import select
import sys

if len(sys.argv) != 3:
    raise SystemExit('usage: watch-worklets-ready.py <pid> <log>')
pid = int(sys.argv[1])
log = Path(sys.argv[2])
marker = 'Worklets fixture ready at '
queue = select.kqueue()
with log.open('rb') as handle:
    try:
        queue.control([select.kevent(
            handle.fileno(), filter=select.KQ_FILTER_VNODE,
            flags=select.KQ_EV_ADD | select.KQ_EV_CLEAR,
            fflags=select.KQ_NOTE_WRITE | select.KQ_NOTE_EXTEND,
        )], 0, 0)
        try:
            queue.control([select.kevent(
                pid, filter=select.KQ_FILTER_PROC,
                flags=select.KQ_EV_ADD | select.KQ_EV_ONESHOT,
                fflags=select.KQ_NOTE_EXIT,
            )], 0, 0)
            os.kill(pid, 0)
        except ProcessLookupError:
            if marker in log.read_text():
                print('server ready; run runtime proofs')
                raise SystemExit(0)
            raise SystemExit('server admission ended without a ready receipt')
        while True:
            if marker in log.read_text():
                print('server ready; run runtime proofs')
                break
            events = queue.control(None, 2, None)
            if any(event.filter == select.KQ_FILTER_PROC for event in events):
                if marker not in log.read_text():
                    raise SystemExit('server admission ended without a ready receipt')
    finally:
        queue.close()
