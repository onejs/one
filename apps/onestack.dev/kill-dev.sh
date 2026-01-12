#!/bin/bash

# Quick script to kill stuck onestack.dev dev server processes
#
# The dev server can get stuck when:
# - Parent process is killed before the dev server gets SIGINT
# - Ctrl+C doesn't propagate through fnm/yarn layers
#
# This script reliably kills all related processes.

PORT=8081

echo "Checking for stuck dev processes..."

# Show what's running
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "Found processes on port $PORT:"
    lsof -i :$PORT
    echo ""
fi

# Find dev processes
DEV_PIDS=$(pgrep -f "Onejs:dev" 2>/dev/null || true)
YARN_PIDS=$(pgrep -f "yarn dev" 2>/dev/null || true)

if [ -z "$DEV_PIDS" ] && [ -z "$YARN_PIDS" ]; then
    echo "No dev processes found."
    exit 0
fi

echo "Found dev processes:"
[ -n "$DEV_PIDS" ] && echo "  Onejs:dev: $DEV_PIDS"
[ -n "$YARN_PIDS" ] && echo "  yarn dev: $YARN_PIDS"
echo ""

# Try graceful kill first
echo "Sending SIGINT (graceful)..."
pkill -INT -f "Onejs:dev" 2>/dev/null || true
sleep 2

# Check if still running
if pgrep -f "Onejs:dev" > /dev/null 2>&1; then
    echo "Processes still running, force killing..."
    pkill -9 -f "Onejs:dev" 2>/dev/null || true
    pkill -9 -f "yarn dev" 2>/dev/null || true
    sleep 1
fi

# Kill any remaining by port
if lsof -t -i :$PORT > /dev/null 2>&1; then
    echo "Killing remaining processes on port $PORT..."
    lsof -t -i :$PORT | xargs kill -9 2>/dev/null || true
    sleep 1
fi

# Final check
if lsof -i :$PORT > /dev/null 2>&1; then
    echo "WARNING: Still have processes on port $PORT:"
    lsof -i :$PORT
    exit 1
else
    echo "All dev processes killed. Port $PORT is free."
fi
