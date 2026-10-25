#!/bin/bash
# Creates and starts the Ubuntu arm64 Lima VM the Linux target builds in, on a
# Mac with limactl. The repo checkout mounts writable and the node_modules
# holding react-native mounts read only; build output and caches stay on the
# VM disk because virtiofs is slow for compiler traffic.
#   LIMA_NAME   instance name (default one-linux)
#   LIMA_CPUS   bounded cpu count (default 8)
#   LIMA_MEMORY memory in GiB (default 16)
#   REPO_ROOT   checkout to mount writable (default: this checkout)
#   NODE_MODULES node_modules to mount read only (default: $HOME/one/node_modules)
set -euo pipefail

name="${LIMA_NAME:-one-linux}"
repo="${REPO_ROOT:-$(cd "$(dirname "$0")/../../../.." && pwd)}"
modules="${NODE_MODULES:-$HOME/one/node_modules}"

if ! limactl list -q 2>/dev/null | grep -qx "$name"; then
  limactl create --name "$name" --tty=false template:ubuntu-24.04 \
    --vm-type vz --arch aarch64 \
    --cpus "${LIMA_CPUS:-8}" --memory "${LIMA_MEMORY:-16}" --disk 60 \
    --mount-only "$repo:w" --mount-only "$modules"
fi
limactl start "$name" --tty=false

# automatic package updates saturate this dev VM's disk during builds and UI checks
limactl shell "$name" sudo systemctl disable --now apt-daily.timer apt-daily-upgrade.timer
