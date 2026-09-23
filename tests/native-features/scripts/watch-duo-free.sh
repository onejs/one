#!/usr/bin/env bash
# Wait for r44963 to send a message to r45065 granting use of the iPhone Duo simulator.
set -euo pipefail

events_file="/Users/n8/.team-machine/scopes/contrast/logs/r44963.events.jsonl"
start_line=3899
deadline=${1:-2400}
interval=10
started=$(date +%s)

echo "watch-duo-free: watching $events_file after line $start_line for messages to r45065 (deadline: ${deadline}s)"

while true; do
  if [ -f "$events_file" ]; then
    if tail -n +"$start_line" "$events_file" 2>/dev/null | grep -E -q "tm send r45065"; then
      echo "watch-duo-free: r44963 sent message to r45065:"
      tail -n +"$start_line" "$events_file" 2>/dev/null | grep -E "tm send r45065" | head -n 1
      exit 0
    fi
  fi

  elapsed=$(($(date +%s) - started))
  if [ "$elapsed" -ge "$deadline" ]; then
    echo "watch-duo-free: deadline passed after ${deadline}s"
    exit 1
  fi
  sleep "$interval"
done
