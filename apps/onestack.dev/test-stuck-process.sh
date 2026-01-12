#!/bin/bash

# Test script to reproduce stuck onestack.dev processes
# This script tries various start/kill scenarios to find what causes processes to hang
#
# ============================================================================
# ROOT CAUSE ANALYSIS:
# ============================================================================
# When running `yarn dev` through fnm (Fast Node Manager), a process chain is created:
#   bash -> fnm wrapper -> yarn -> node (Onejs:dev) -> esbuild children
#
# The problem: SIGINT sent to the fnm wrapper or yarn process does NOT propagate
# properly to child processes. This is because:
#   1. fnm creates a shell wrapper that spawns node
#   2. The wrapper doesn't set up proper signal forwarding
#   3. When you Ctrl+C or kill the outer process, inner processes get orphaned
#
# TESTED KILL METHODS:
#   ❌ kill -INT <yarn_pid>        - Doesn't propagate to children
#   ❌ kill -INT <fnm_wrapper>     - Doesn't propagate to children
#   ❌ kill -INT -<pgid>           - Process group kill also fails
#   ✅ kill -INT <Onejs:dev_pid>   - WORKS! Kill the actual dev server directly
#   ✅ pkill -f "Onejs:dev"        - WORKS! Kill by pattern
#
# RELIABLE CLEANUP COMMAND:
#   pkill -INT -f "Onejs:dev" && pkill -INT -f "yarn dev"
#
# Or force kill if graceful doesn't work:
#   pkill -9 -f "Onejs:dev"; pkill -9 -f "yarn dev"
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PORT=8081
LOG_FILE="test-stuck-process.log"

log() {
    local msg="[$(date '+%H:%M:%S')] $1"
    echo -e "$msg"
    echo "$msg" >> "$LOG_FILE"
}

log_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo "========================================"  >> "$LOG_FILE"
    echo "$1" >> "$LOG_FILE"
    echo "========================================"  >> "$LOG_FILE"
}

# Check if port is in use
check_port() {
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo -e "${RED}PORT $PORT IS IN USE${NC}"
        lsof -i :$PORT
        return 1
    else
        echo -e "${GREEN}Port $PORT is free${NC}"
        return 0
    fi
}

# Find all node/one processes related to this project
find_related_processes() {
    log "Looking for related processes..."

    # Find processes by port
    log "Processes on port $PORT:"
    lsof -i :$PORT 2>/dev/null || echo "  (none)"

    # Find node processes in this directory
    log "Node processes in $SCRIPT_DIR:"
    pgrep -f "node.*$SCRIPT_DIR" 2>/dev/null | while read pid; do
        ps -p "$pid" -o pid,ppid,stat,command 2>/dev/null || true
    done

    # Find vite/one processes
    log "Vite/One dev processes:"
    pgrep -f "vite.*dev|one.*dev" 2>/dev/null | while read pid; do
        ps -p "$pid" -o pid,ppid,stat,command 2>/dev/null || true
    done
}

# Kill all related processes
cleanup() {
    log "Cleaning up all related processes..."

    # Kill by port first
    lsof -t -i :$PORT 2>/dev/null | xargs -r kill -9 2>/dev/null || true

    # Kill specific process patterns
    pkill -9 -f "Onejs:dev" 2>/dev/null || true
    pkill -9 -f "yarn dev" 2>/dev/null || true
    pkill -9 -f "yarn.*workspace.*dev" 2>/dev/null || true
    pkill -9 -f "one dev" 2>/dev/null || true
    pkill -9 -f "node.*onestack.dev" 2>/dev/null || true
    pkill -9 -f "vite.*onestack" 2>/dev/null || true

    # Kill any orphaned esbuild from this project
    pgrep -f "esbuild.*onestack" 2>/dev/null | xargs -r kill -9 2>/dev/null || true

    sleep 1

    # Double-check port is free
    local remaining=$(lsof -t -i :$PORT 2>/dev/null || true)
    if [ -n "$remaining" ]; then
        log "Still have processes on port: $remaining"
        echo "$remaining" | xargs -r kill -9 2>/dev/null || true
        sleep 1
    fi
}

# Start dev server via yarn (has signal forwarding issues)
start_dev_yarn() {
    log "Starting dev server via YARN..."
    yarn dev > /tmp/onestack-dev.log 2>&1 &
    local pid=$!
    sleep 0.5
    echo $pid
}

# Start dev server directly with node (bypasses yarn)
start_dev_node() {
    log "Starting dev server via NODE directly (no yarn)..."
    # Run the one bin script directly (it's just a node shim)
    ../../node_modules/.bin/one dev > /tmp/onestack-dev.log 2>&1 &
    local pid=$!
    sleep 0.5
    echo $pid
}

# Default: use node directly to avoid yarn signal issues
start_dev() {
    start_dev_node
}

# Get the actual dev server PID (the Onejs:dev process)
get_dev_server_pid() {
    pgrep -f "Onejs:dev.*onestack" 2>/dev/null | head -1
}

# Get all PIDs in the dev server process tree
get_all_dev_pids() {
    local pids=""
    # Find all related processes
    pids="$pids $(pgrep -f 'Onejs:dev.*onestack' 2>/dev/null || true)"
    pids="$pids $(pgrep -f 'yarn dev' 2>/dev/null || true)"
    pids="$pids $(pgrep -f 'yarn.*dev' 2>/dev/null || true)"
    pids="$pids $(lsof -t -i :$PORT 2>/dev/null || true)"
    # Deduplicate
    echo "$pids" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' '
}

# Kill entire process group
kill_process_group() {
    local pid=$1
    local signal=${2:-INT}
    log "Killing process group of PID $pid with SIG$signal..."
    # Kill the process group (negative PID)
    kill -$signal -$pid 2>/dev/null || kill -$signal $pid 2>/dev/null || true
}

# Wait for server to be ready (check port)
wait_for_ready() {
    local max_wait=30
    local waited=0
    log "Waiting for server to be ready on port $PORT..."

    while ! lsof -i :$PORT > /dev/null 2>&1; do
        sleep 1
        waited=$((waited + 1))
        if [ $waited -ge $max_wait ]; then
            log "Timeout waiting for server"
            return 1
        fi
    done
    log "Server ready after ${waited}s"
    return 0
}

# Warm a page by making HTTP request
warm_page() {
    local url="${1:-http://localhost:$PORT}"
    log "Warming page: $url"
    curl -s -o /dev/null -w "%{http_code}" "$url" || echo "failed"
}

# Run a test scenario
run_test() {
    local test_name="$1"
    local kill_signal="$2"
    local pre_kill_action="$3"
    local delay_before_kill="$4"

    log_header "TEST: $test_name"
    log "Signal: $kill_signal, Pre-kill: $pre_kill_action, Delay: ${delay_before_kill}s"

    cleanup
    sleep 1

    if ! check_port; then
        log "${RED}FAILED: Port not free before test${NC}"
        return 1
    fi

    # Start server
    local pid=$(start_dev)
    log "Started with PID: $pid"

    # Wait for ready or delay
    if [ "$pre_kill_action" = "wait_ready" ]; then
        if ! wait_for_ready; then
            log "Server didn't start, killing..."
            kill -9 $pid 2>/dev/null || true
            return 1
        fi
    elif [ "$pre_kill_action" = "warm_page" ]; then
        if wait_for_ready; then
            warm_page "http://localhost:$PORT/"
            sleep 1
            warm_page "http://localhost:$PORT/docs"
        fi
    fi

    # Optional delay before kill
    if [ -n "$delay_before_kill" ] && [ "$delay_before_kill" != "0" ]; then
        log "Waiting ${delay_before_kill}s before kill..."
        sleep "$delay_before_kill"
    fi

    # Send kill signal
    log "Sending $kill_signal to PID $pid..."

    case "$kill_signal" in
        "SIGINT")
            kill -INT $pid 2>/dev/null || true
            ;;
        "SIGTERM")
            kill -TERM $pid 2>/dev/null || true
            ;;
        "SIGKILL")
            kill -9 $pid 2>/dev/null || true
            ;;
        "CTRL_C")
            # Simulate Ctrl+C by sending to process group
            kill -INT -$pid 2>/dev/null || kill -INT $pid 2>/dev/null || true
            ;;
        *)
            kill $pid 2>/dev/null || true
            ;;
    esac

    # Wait for process to exit
    log "Waiting for process to exit (max 10s)..."
    local wait_count=0
    while kill -0 $pid 2>/dev/null; do
        sleep 1
        wait_count=$((wait_count + 1))
        if [ $wait_count -ge 10 ]; then
            log "${RED}Process didn't exit in 10s - STUCK!${NC}"
            log "Process state:"
            ps -p $pid -o pid,ppid,stat,command 2>/dev/null || echo "  (process gone)"

            # Check children
            log "Child processes:"
            pgrep -P $pid 2>/dev/null | while read cpid; do
                ps -p "$cpid" -o pid,ppid,stat,command 2>/dev/null || true
            done

            # Force kill
            log "Force killing..."
            kill -9 $pid 2>/dev/null || true
            pkill -9 -P $pid 2>/dev/null || true
            break
        fi
    done

    # Final check
    sleep 2
    log "Final state check:"
    find_related_processes

    if check_port; then
        log "${GREEN}TEST PASSED: Port is free${NC}"
        return 0
    else
        log "${RED}TEST FAILED: Port still in use!${NC}"
        return 1
    fi
}

# Test: Kill immediately during startup (before server binds port)
test_kill_during_startup() {
    run_test "Kill during startup (SIGINT)" "SIGINT" "none" "1"
}

# Test: Kill after server ready (SIGINT)
test_kill_after_ready_sigint() {
    run_test "Kill after ready (SIGINT)" "SIGINT" "wait_ready" "1"
}

# Test: Kill after server ready (SIGTERM)
test_kill_after_ready_sigterm() {
    run_test "Kill after ready (SIGTERM)" "SIGTERM" "wait_ready" "1"
}

# Test: Kill after warming pages
test_kill_after_warm() {
    run_test "Kill after warming pages (SIGINT)" "SIGINT" "warm_page" "2"
}

# Test: Kill immediately after warm (no delay)
test_kill_immediate_after_warm() {
    run_test "Kill immediately after warm" "SIGINT" "warm_page" "0"
}

# Test: Rapid start/stop cycles
test_rapid_cycles() {
    log_header "TEST: Rapid start/stop cycles"

    for i in {1..5}; do
        log "Cycle $i..."
        cleanup

        local pid=$(start_dev)
        sleep 2
        kill -INT $pid 2>/dev/null || true
        sleep 2

        if ! check_port; then
            log "${RED}Stuck after cycle $i!${NC}"
            find_related_processes
            return 1
        fi
    done

    log "${GREEN}All rapid cycles passed${NC}"
}

# Test: Kill during active request
test_kill_during_request() {
    log_header "TEST: Kill during active request"

    cleanup
    local pid=$(start_dev)

    if wait_for_ready; then
        # Start a long request in background
        curl -s "http://localhost:$PORT/docs" &
        local curl_pid=$!

        # Kill server while request is in progress
        sleep 0.5
        kill -INT $pid 2>/dev/null || true

        wait $curl_pid 2>/dev/null || true
    fi

    sleep 3
    if check_port; then
        log "${GREEN}TEST PASSED${NC}"
    else
        log "${RED}TEST FAILED - Port stuck!${NC}"
        find_related_processes
    fi
}

# Test: Multiple concurrent requests then kill
test_concurrent_requests() {
    log_header "TEST: Concurrent requests then kill"

    cleanup
    local pid=$(start_dev)

    if wait_for_ready; then
        # Fire multiple concurrent requests
        for i in {1..10}; do
            curl -s "http://localhost:$PORT/" > /dev/null &
        done

        # Kill while requests are happening
        sleep 0.3
        kill -INT $pid 2>/dev/null || true

        # Wait for curl processes
        wait 2>/dev/null || true
    fi

    sleep 3
    if check_port; then
        log "${GREEN}TEST PASSED${NC}"
    else
        log "${RED}TEST FAILED - Port stuck!${NC}"
        find_related_processes
    fi
}

# Test: SIGKILL (force kill)
test_sigkill() {
    run_test "Force kill (SIGKILL)" "SIGKILL" "warm_page" "1"
}

# Test: Double SIGINT (like pressing Ctrl+C twice)
test_double_sigint() {
    log_header "TEST: Double SIGINT"

    cleanup
    local pid=$(start_dev)

    if wait_for_ready; then
        warm_page "http://localhost:$PORT/"

        log "Sending first SIGINT..."
        kill -INT $pid 2>/dev/null || true
        sleep 0.5
        log "Sending second SIGINT..."
        kill -INT $pid 2>/dev/null || true
    fi

    sleep 5
    if check_port; then
        log "${GREEN}TEST PASSED${NC}"
    else
        log "${RED}TEST FAILED - Port stuck!${NC}"
        find_related_processes
    fi
}

# Test: Kill the actual Onejs:dev process directly
test_kill_direct_dev_process() {
    log_header "TEST: Kill actual Onejs:dev process directly"

    cleanup
    local yarn_pid=$(start_dev)

    if wait_for_ready; then
        # Find the actual dev server process
        local dev_pid=$(get_dev_server_pid)
        if [ -z "$dev_pid" ]; then
            log "${RED}Could not find Onejs:dev process${NC}"
            return 1
        fi

        log "Found Onejs:dev process: $dev_pid (parent yarn: $yarn_pid)"
        log "Process tree:"
        ps -eo pid,ppid,stat,command | grep -E "$yarn_pid|$dev_pid|esbuild" | grep -v grep

        # Kill the actual dev server directly
        log "Sending SIGINT to Onejs:dev process $dev_pid..."
        kill -INT $dev_pid 2>/dev/null || true
    fi

    sleep 5

    log "Final state:"
    find_related_processes

    if check_port; then
        log "${GREEN}TEST PASSED${NC}"
    else
        log "${RED}TEST FAILED - Port stuck!${NC}"
    fi
}

# Test: Kill process group instead of single process
test_kill_process_group() {
    log_header "TEST: Kill process group"

    cleanup
    local yarn_pid=$(start_dev)

    if wait_for_ready; then
        log "Process tree before kill:"
        ps -eo pid,ppid,pgid,stat,command | grep -E "yarn.*dev|Onejs|$yarn_pid" | grep -v grep

        # Get the process group ID
        local pgid=$(ps -o pgid= -p $yarn_pid 2>/dev/null | tr -d ' ')
        log "Process group ID: $pgid"

        if [ -n "$pgid" ]; then
            log "Sending SIGINT to process group $pgid..."
            kill -INT -$pgid 2>/dev/null || true
        else
            log "No PGID found, killing individual PID..."
            kill -INT $yarn_pid 2>/dev/null || true
        fi
    fi

    sleep 5

    log "Final state:"
    find_related_processes

    if check_port; then
        log "${GREEN}TEST PASSED${NC}"
    else
        log "${RED}TEST FAILED - Port stuck!${NC}"
    fi
}

# Test: Kill all processes by pattern
test_kill_all_by_pattern() {
    log_header "TEST: Kill all processes by pattern"

    cleanup
    local yarn_pid=$(start_dev)

    if wait_for_ready; then
        warm_page "http://localhost:$PORT/"

        log "Process tree before kill:"
        ps -eo pid,ppid,stat,command | grep -E "yarn.*dev|Onejs|esbuild" | grep -v grep

        log "Killing all dev processes by pattern..."
        pkill -INT -f "Onejs:dev" 2>/dev/null || true
        sleep 1
        pkill -INT -f "yarn dev" 2>/dev/null || true
    fi

    sleep 3

    log "Final state:"
    find_related_processes

    if check_port; then
        log "${GREEN}TEST PASSED${NC}"
    else
        log "${RED}TEST FAILED - Port stuck!${NC}"
    fi
}

# Test: Compare yarn vs node vs bun signal handling
test_yarn_vs_node() {
    log_header "TEST: Yarn vs Node vs Bun signal comparison"

    # Test 1: Yarn
    log "--- Testing YARN ---"
    cleanup

    log "Starting via yarn..."
    yarn dev > /tmp/onestack-dev.log 2>&1 &
    local yarn_pid=$!

    if wait_for_ready; then
        log "Yarn process tree:"
        ps -eo pid,ppid,stat,command | grep -E "yarn.*dev|Onejs" | grep -v grep

        log "Sending SIGINT to yarn PID $yarn_pid..."
        kill -INT $yarn_pid 2>/dev/null || true
        sleep 3

        if check_port; then
            log "${GREEN}YARN: Port freed correctly${NC}"
        else
            log "${RED}YARN: Port STUCK${NC}"
            find_related_processes
        fi
    fi

    cleanup
    sleep 2

    # Test 2: Node directly
    log "--- Testing NODE directly ---"

    log "Starting via node..."
    ../../node_modules/.bin/one dev > /tmp/onestack-dev.log 2>&1 &
    local node_pid=$!

    if wait_for_ready; then
        log "Node process tree:"
        ps -eo pid,ppid,stat,command | grep -E "Onejs|one.*dev" | grep -v grep

        log "Sending SIGINT to node PID $node_pid..."
        kill -INT $node_pid 2>/dev/null || true
        sleep 3

        if check_port; then
            log "${GREEN}NODE: Port freed correctly${NC}"
        else
            log "${RED}NODE: Port STUCK${NC}"
            find_related_processes
        fi
    fi

    cleanup
    sleep 2

    # Test 3: Bun
    if command -v bun &> /dev/null; then
        log "--- Testing BUN ---"

        log "Starting via bun..."
        bun run dev > /tmp/onestack-dev.log 2>&1 &
        local bun_pid=$!

        if wait_for_ready; then
            log "Bun process tree:"
            ps -eo pid,ppid,stat,command | grep -E "bun|Onejs|one.*dev" | grep -v grep

            log "Sending SIGINT to bun PID $bun_pid..."
            kill -INT $bun_pid 2>/dev/null || true
            sleep 3

            if check_port; then
                log "${GREEN}BUN: Port freed correctly${NC}"
            else
                log "${RED}BUN: Port STUCK${NC}"
                find_related_processes
            fi
        fi

        cleanup
    else
        log "Bun not installed, skipping bun test"
    fi
}

# Test: Proper terminal shutdown simulation
test_proper_shutdown() {
    log_header "TEST: Proper terminal shutdown"

    cleanup

    # Start in a way that simulates terminal session (subshell)
    log "Starting dev server in subshell..."
    (
        exec yarn dev > /tmp/onestack-dev.log 2>&1
    ) &
    local shell_pid=$!

    sleep 3

    if wait_for_ready; then
        log "Process tree:"
        ps -eo pid,ppid,pgid,stat,command | grep -E "yarn.*dev|Onejs|$shell_pid" | grep -v grep

        # Find all related processes
        local all_pids=$(get_all_dev_pids)
        log "All dev PIDs: $all_pids"

        log "Sending SIGINT to shell pid $shell_pid..."
        kill -INT $shell_pid 2>/dev/null || true

        sleep 2

        # Check if processes are still running
        log "After SIGINT, remaining:"
        ps -eo pid,ppid,stat,command | grep -E "yarn.*dev|Onejs" | grep -v grep || echo "  (none)"
    fi

    sleep 3

    if check_port; then
        log "${GREEN}TEST PASSED${NC}"
    else
        log "${RED}TEST FAILED - Port stuck!${NC}"
        find_related_processes
    fi
}

# Main
main() {
    echo "" > "$LOG_FILE"
    log_header "Starting stuck process tests"
    log "Working directory: $SCRIPT_DIR"
    log "Port: $PORT"
    log "Log file: $LOG_FILE"

    # Initial cleanup
    cleanup

    # Check initial state
    log "Initial port check:"
    check_port || cleanup

    echo ""
    echo "Select test to run:"
    echo "  1) Kill during startup"
    echo "  2) Kill after ready (SIGINT)"
    echo "  3) Kill after ready (SIGTERM)"
    echo "  4) Kill after warming pages"
    echo "  5) Kill immediately after warm"
    echo "  6) Rapid start/stop cycles"
    echo "  7) Kill during active request"
    echo "  8) Concurrent requests then kill"
    echo "  9) Force kill (SIGKILL)"
    echo "  10) Double SIGINT"
    echo "  11) Kill direct dev process (Onejs:dev)"
    echo "  12) Kill process group"
    echo "  13) Kill all by pattern"
    echo "  14) Proper terminal shutdown simulation"
    echo "  15) YARN vs NODE comparison"
    echo ""
    echo "  a) Run ALL tests"
    echo "  q) Quick tests (11-15 only)"
    echo "  c) Cleanup only"
    echo "  s) Status check"
    echo ""
    read -p "Choice: " choice

    case "$choice" in
        1) test_kill_during_startup ;;
        2) test_kill_after_ready_sigint ;;
        3) test_kill_after_ready_sigterm ;;
        4) test_kill_after_warm ;;
        5) test_kill_immediate_after_warm ;;
        6) test_rapid_cycles ;;
        7) test_kill_during_request ;;
        8) test_concurrent_requests ;;
        9) test_sigkill ;;
        10) test_double_sigint ;;
        11) test_kill_direct_dev_process ;;
        12) test_kill_process_group ;;
        13) test_kill_all_by_pattern ;;
        14) test_proper_shutdown ;;
        15) test_yarn_vs_node ;;
        a|A)
            test_kill_during_startup
            test_kill_after_ready_sigint
            test_kill_after_ready_sigterm
            test_kill_after_warm
            test_kill_immediate_after_warm
            test_rapid_cycles
            test_kill_during_request
            test_concurrent_requests
            test_sigkill
            test_double_sigint
            test_kill_direct_dev_process
            test_kill_process_group
            test_kill_all_by_pattern
            test_proper_shutdown
            ;;
        q|Q)
            test_yarn_vs_node
            ;;
        c|C)
            cleanup
            check_port
            ;;
        s|S)
            find_related_processes
            check_port
            ;;
        *)
            log "Invalid choice"
            ;;
    esac

    log_header "Tests complete"
    log "Check $LOG_FILE for full output"
}

main "$@"
