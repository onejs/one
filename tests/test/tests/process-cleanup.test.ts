import { spawn, type ChildProcess } from 'node:child_process'
import { afterEach, describe, expect, test } from 'vitest'
import getPort from 'get-port'

// Helper to wait for a process to exit
function waitForExit(proc: ChildProcess, timeout = 5000): Promise<number | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeout)
    proc.on('exit', (code) => {
      clearTimeout(timer)
      resolve(code)
    })
  })
}

// Helper to check if process is still running
function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

describe('process cleanup', () => {
  let devServer: ChildProcess | null = null
  let wrapper: ChildProcess | null = null

  afterEach(() => {
    // Clean up any leftover processes
    if (devServer?.pid && isRunning(devServer.pid)) {
      process.kill(devServer.pid, 'SIGKILL')
    }
    if (wrapper?.pid && isRunning(wrapper.pid)) {
      process.kill(wrapper.pid, 'SIGKILL')
    }
  })

  test('dev server exits when parent is killed (orphan detection)', async () => {
    const port = await getPort()

    // Spawn a wrapper process that spawns the dev server
    // When we kill the wrapper, the dev server should detect it's orphaned and exit
    wrapper = spawn(
      'node',
      [
        '-e',
        `
        const { spawn } = require('child_process');
        const dev = spawn('node', ['../../node_modules/.bin/one', 'dev', '--port', '${port}'], {
          stdio: 'inherit'
        });
        dev.unref();
        // Keep wrapper alive
        setInterval(() => {}, 1000);
        `,
      ],
      {
        cwd: process.cwd(),
        stdio: 'pipe',
      }
    )

    // Wait for dev server to start
    await new Promise((r) => setTimeout(r, 8000))

    // Find the dev server process
    const devPid = await new Promise<number | null>((resolve) => {
      const pgrep = spawn('pgrep', ['-f', `one.*dev.*port.*${port}`])
      let output = ''
      pgrep.stdout?.on('data', (d) => (output += d.toString()))
      pgrep.on('close', () => {
        const pid = parseInt(output.trim().split('\n')[0], 10)
        resolve(isNaN(pid) ? null : pid)
      })
    })

    expect(devPid).toBeTruthy()

    // Kill the wrapper (simulating vitest being killed)
    if (wrapper.pid) {
      process.kill(wrapper.pid, 'SIGKILL')
    }

    // Wait for dev server to detect orphan and exit (should happen within 2 seconds)
    await new Promise((r) => setTimeout(r, 2000))

    // Dev server should have exited
    const stillRunning = devPid ? isRunning(devPid) : false
    expect(stillRunning).toBe(false)
  }, 20000)

  test('dev server does not exit prematurely when parent is alive', async () => {
    const port = await getPort()

    devServer = spawn('node', ['../../node_modules/.bin/one', 'dev', '--port', port.toString()], {
      cwd: process.cwd(),
      stdio: 'pipe',
    })

    // Wait for dev server to start
    await new Promise((r) => setTimeout(r, 6000))

    // Dev server should still be running
    expect(devServer.pid).toBeTruthy()
    expect(isRunning(devServer.pid!)).toBe(true)

    // Wait a bit more - should still be alive
    await new Promise((r) => setTimeout(r, 2000))
    expect(isRunning(devServer.pid!)).toBe(true)

    // Clean up
    devServer.kill('SIGTERM')
  }, 15000)
})
