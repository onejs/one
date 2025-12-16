import { spawn, execSync } from 'node:child_process'
import { describe, expect, it, afterEach } from 'vitest'
import getPort from 'get-port'

/**
 * Tests to ensure dev/serve processes properly cleanup when receiving signals.
 *
 * Note: These tests verify that processes exit cleanly on SIGTERM/SIGINT.
 * SIGKILL (kill -9) cannot be handled and may leave orphan processes.
 */
describe('Process Cleanup', () => {
  const spawnedPids: number[] = []

  function getChildPids(parentPid: number): number[] {
    try {
      const output = execSync(`pgrep -P ${parentPid}`, { encoding: 'utf-8' })
      return output.trim().split('\n').filter(Boolean).map(Number)
    } catch {
      return []
    }
  }

  function getAllDescendantPids(parentPid: number): number[] {
    const childPids = getChildPids(parentPid)
    const allPids = [...childPids]
    for (const childPid of childPids) {
      allPids.push(...getAllDescendantPids(childPid))
    }
    return allPids
  }

  function isProcessRunning(pid: number): boolean {
    try {
      process.kill(pid, 0)
      return true
    } catch {
      return false
    }
  }

  afterEach(async () => {
    for (const pid of spawnedPids) {
      const descendants = getAllDescendantPids(pid)
      for (const dpid of [...descendants, pid]) {
        try {
          process.kill(dpid, 'SIGKILL')
        } catch {
          // Ignore
        }
      }
    }
    spawnedPids.length = 0
    await new Promise((r) => setTimeout(r, 500))
  })

  it('dev server should exit cleanly on SIGTERM', async () => {
    const port = await getPort()

    const devProcess = spawn(
      'node',
      ['../../node_modules/.bin/one', 'dev', '--port', port.toString()],
      {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
      }
    )

    const mainPid = devProcess.pid!
    spawnedPids.push(mainPid)

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Get all PIDs before killing
    const allPidsBefore = [mainPid, ...getAllDescendantPids(mainPid)]
    console.log(`Process tree before SIGTERM: ${allPidsBefore.join(', ')}`)

    // Send SIGTERM (graceful shutdown)
    try {
      process.kill(mainPid, 'SIGTERM')
    } catch {
      // Ignore
    }

    // Wait for graceful shutdown
    await new Promise((resolve) => setTimeout(resolve, 3000))

    // Check if processes exited
    const stillRunning = allPidsBefore.filter((pid) => isProcessRunning(pid))

    if (stillRunning.length > 0) {
      console.log(`Still running after SIGTERM: ${stillRunning.join(', ')}`)
    }

    expect(stillRunning).toHaveLength(0)
  }, 30000)

  it('dev server should exit cleanly on SIGINT (Ctrl+C)', async () => {
    const port = await getPort()

    const devProcess = spawn(
      'node',
      ['../../node_modules/.bin/one', 'dev', '--port', port.toString()],
      {
        cwd: process.cwd(),
        detached: true,
        stdio: 'ignore',
      }
    )

    const mainPid = devProcess.pid!
    spawnedPids.push(mainPid)

    // Wait for server to start
    await new Promise((resolve) => setTimeout(resolve, 5000))

    const allPidsBefore = [mainPid, ...getAllDescendantPids(mainPid)]
    console.log(`Process tree before SIGINT: ${allPidsBefore.join(', ')}`)

    // Send SIGINT (Ctrl+C)
    try {
      process.kill(mainPid, 'SIGINT')
    } catch {
      // Ignore
    }

    // Wait for shutdown
    await new Promise((resolve) => setTimeout(resolve, 3000))

    const stillRunning = allPidsBefore.filter((pid) => isProcessRunning(pid))

    if (stillRunning.length > 0) {
      console.log(`Still running after SIGINT: ${stillRunning.join(', ')}`)
    }

    expect(stillRunning).toHaveLength(0)
  }, 30000)

  it('serve process should exit cleanly on SIGINT', async () => {
    const port = await getPort()

    const serveProcess = spawn(
      'node',
      ['../../node_modules/.bin/one', 'serve', '--port', port.toString()],
      {
        cwd: process.cwd(),
        detached: true,
        stdio: 'pipe',
      }
    )

    const mainPid = serveProcess.pid!
    spawnedPids.push(mainPid)

    // Wait for serve to start (or fail if no build)
    await new Promise((resolve) => setTimeout(resolve, 2000))

    if (!isProcessRunning(mainPid)) {
      console.log('Serve process exited early (probably no build), skipping')
      return
    }

    // Send SIGINT
    try {
      process.kill(mainPid, 'SIGINT')
    } catch {
      // Ignore
    }

    // Wait for shutdown
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const stillRunning = isProcessRunning(mainPid)

    expect(stillRunning).toBe(false)
  }, 30000)
})
