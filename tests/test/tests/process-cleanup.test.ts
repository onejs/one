import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import getPort from 'get-port'

// Resolve one's JS entry (run.mjs) instead of node_modules/.bin/one: on Windows
// the .bin shim is a .cmd/.ps1/.exe wrapper that `node <path>` can't load
// (MODULE_NOT_FOUND), so the dev server never starts. Resolving via package.json
// gives the real JS file on every platform (mirrors packages/test/src/setupTest.ts).
const oneRunEntry = join(
  dirname(createRequire(import.meta.url).resolve('one/package.json')),
  'run.mjs'
)

// node cannot signal a process tree on Windows; taskkill /T kills spawned workers too
function killTree(proc: ChildProcess) {
  if (!proc.pid) return
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/F', '/T', '/PID', String(proc.pid)], { stdio: 'ignore' })
    } catch {}
  } else {
    try {
      process.kill(proc.pid, 'SIGKILL')
    } catch {}
  }
}

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
    // Clean up any leftover processes (tree-kill so dev-server workers don't orphan)
    if (devServer?.pid && isRunning(devServer.pid)) {
      killTree(devServer)
    }
    if (wrapper?.pid && isRunning(wrapper.pid)) {
      killTree(wrapper)
    }
  })

  // orphan detection is POSIX-only by design (setupOrphanDetection in
  // packages/vxrn/src/exports/dev.ts returns early on win32), and the test
  // discovers the grandchild via pgrep — skip on Windows rather than fail
  test.skipIf(process.platform === 'win32')(
    'dev server exits when parent is killed (orphan detection)',
    async () => {
      const port = await getPort()

      // Spawn a wrapper process that spawns the dev server
      // When we kill the wrapper, the dev server should detect it's orphaned and exit
      wrapper = spawn(
        'node',
        [
          '-e',
          `
        const { spawn } = require('child_process');
        const dev = spawn('node', [${JSON.stringify(oneRunEntry)}, 'dev', '--port', '${port}'], {
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
    },
    20000
  )

  test('dev server does not exit prematurely when parent is alive', async () => {
    const port = await getPort()

    devServer = spawn('node', [oneRunEntry, 'dev', '--port', port.toString()], {
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

    // Clean up (tree-kill so dev-server workers don't orphan on Windows)
    killTree(devServer)
  }, 15000)
})
