#!/usr/bin/env zsh
set -e

CONFIGURATION=$1

if [ -z "$CONFIGURATION" ]; then
  echo "Error: expected 'Debug' or 'Release' as the first argument"
  exit 1
fi

cd "$(dirname "$0")/.."

echo "$(pwd)/ios/build-${CONFIGURATION}"
