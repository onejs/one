#!/bin/bash

# Ensure the script runs as root
if [ "$(id -u)" != "0" ]; then
    echo "This script must be run as root" >&2
    exit 1
fi

# Ensure the script is running on Linux (not macOS)
if [ "$(uname)" = "Darwin" ]; then
    echo "This script must be run on Linux" >&2
    exit 1
fi

# Skip the container check, since we're running inside Docker
# Removed: Checking if inside Docker with /.dockerenv

# Optionally skip port checks if running in Docker
# Check if something is running on port 80 and 443 only if not in Docker
if ! [ -f /.dockerenv ]; then
    if ss -tulnp | grep ':80 ' >/dev/null; then
        echo "Error: something is already running on port 80" >&2
        exit 1
    fi

    if ss -tulnp | grep ':443 ' >/dev/null; then
        echo "Error: something is already running on port 443" >&2
        exit 1
    fi
fi

# Function to check if a command exists
command_exists() {
    command -v "$@" > /dev/null 2>&1
}

# Install Docker if it isn't already installed
if command_exists docker; then
    echo "Docker already installed"
else
    curl -sSL https://get.docker.com | sh
fi

# Ensure Docker Swarm mode is reset
docker swarm leave --force 2>/dev/null || true

# Get IP address for Swarm advertise address
get_ip() {
    # Try to get IPv4
    local ipv4=$(curl -4s https://ifconfig.io 2>/dev/null)

    if [ -n "$ipv4" ]; then
        echo "$ipv4"
    else
        # Try to get IPv6 if IPv4 is not available
        local ipv6=$(curl -6s https://ifconfig.io 2>/dev/null)
        if [ -n "$ipv6" ]; then
            echo "$ipv6"
        fi
    fi
}

# Set advertise address for Swarm based on the system's IP
advertise_addr=$(get_ip)

# Initialize Docker Swarm
docker swarm init --advertise-addr "$advertise_addr"

echo "Swarm initialized"

# Recreate Dokploy network
docker network rm -f dokploy-network 2>/dev/null || true
docker network create --driver overlay --attachable dokploy-network

echo "Network created"

# Ensure Dokploy directory exists with correct permissions
mkdir -p /etc/dokploy
chmod 777 /etc/dokploy

# Pull the latest Dokploy Docker image
docker pull dokploy/dokploy:latest

# Deploy Dokploy as a Docker service
docker service create \
  --name dokploy \
  --replicas 1 \
  --network dokploy-network \
  --mount type=bind,source=/var/run/docker.sock,target=/var/run/docker.sock \
  --mount type=bind,source=/etc/dokploy,target=/etc/dokploy \
  --mount type=volume,source=dokploy-docker-config,target=/root/.docker \
  --publish published=3000,target=3000,mode=host \
  --update-parallelism 1 \
  --update-order stop-first \
  --constraint 'node.role == manager' \
  dokploy/dokploy:latest

# Colors for output
GREEN="\033[0;32m"
YELLOW="\033[1;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Format IP for URL (handling IPv6 formatting)
format_ip_for_url() {
    local ip="$1"
    if echo "$ip" | grep -q ':'; then
        # IPv6, format it with brackets
        echo "[${ip}]"
    else
        # IPv4, no formatting needed
        echo "${ip}"
    fi
}

# Format advertise address for output
formatted_addr=$(format_ip_for_url "$advertise_addr")

# Output success message with formatted IP address
echo ""
printf "${GREEN}Congratulations, Dokploy is installed!${NC}\n"
printf "${BLUE}Wait 15 seconds for the server to start${NC}\n"
printf "${YELLOW}Please go to http://${formatted_addr}:3000${NC}\n\n"
echo ""
