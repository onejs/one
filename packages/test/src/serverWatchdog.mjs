// Supervises a test server so it cannot outlive the test run.
//
// The servers are spawned detached, which is what lets teardown kill the whole
// process group (dev/serve fork workers that a bare kill would strand). The cost
// is that a detached process is in its own group, so it never receives the
// terminal's SIGINT, and vitest's globalSetup teardown only fires on a graceful
// exit. Any hard stop — a CI timeout, turbo cancelling the task, SIGKILL — used
// to leave the server running as a PPID 1 orphan. Metro falls back to recursive
// Node file watching when Watchman is unavailable, so each stranded server sat
// pegging a core (and fseventsd) indefinitely.
//
// This process is the group leader the harness spawns. It runs the real server
// as a non-detached child so the server joins this group, which keeps
// `process.kill(-watchdogPid)` in teardown working exactly as before. On top of
// that it polls the test runner for liveness and takes the group down the moment
// the runner is gone, whatever killed it.
import { spawn } from 'node:child_process'

const PARENT_POLL_INTERVAL = 1000

const parentPid = Number(process.argv[2])
const [command, ...args] = process.argv.slice(3)

if (!Number.isInteger(parentPid) || !command) {
  console.error('serverWatchdog: expected <parentPid> <command> [...args]')
  process.exit(1)
}

// inherit so the harness keeps reading the server's output for port discovery
// and crash diagnostics
const child = spawn(command, args, { stdio: 'inherit' })

child.on('error', (error) => {
  console.error(`serverWatchdog: failed to spawn ${command}: ${error.message}`)
  process.exit(1)
})

// propagate the server's exit so the harness still sees real crash codes
child.on('exit', (code, signal) => {
  clearInterval(parentPoll)
  process.exit(signal ? 1 : (code ?? 0))
})

const parentPoll = setInterval(() => {
  try {
    // signal 0 delivers nothing, it only tests whether the pid is still alive
    process.kill(parentPid, 0)
  } catch {
    clearInterval(parentPoll)
    // kills this whole group: the watchdog, the server, and its workers
    try {
      process.kill(-process.pid, 'SIGKILL')
    } catch {
      child.kill('SIGKILL')
      process.exit(1)
    }
  }
}, PARENT_POLL_INTERVAL)
