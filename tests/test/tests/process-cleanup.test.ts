import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, test } from 'vitest'
import getPort from 'get-port'
import { killProcessTree } from './process-tree'

// Resolve one's JS entry (run.mjs) instead of node_modules/.bin/one: on Windows
// the .bin shim is a .cmd/.ps1/.exe wrapper that `node <path>` can't load
// (MODULE_NOT_FOUND), so the dev server never starts. Resolving via package.json
// gives the real JS file on every platform (mirrors packages/test/src/setupTest.ts).
const oneRunEntry = join(
  dirname(createRequire(import.meta.url).resolve('one/package.json')),
  'run.mjs'
)

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

  afterEach(async () => {
    // Clean up any leftover processes (tree-kill so dev-server workers don't orphan)
    if (devServer?.pid && isRunning(devServer.pid)) {
      await killProcessTree(devServer.pid)
    }
    if (wrapper?.pid && isRunning(wrapper.pid)) {
      await killProcessTree(wrapper.pid)
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
      // group leader on POSIX so killProcessTree can signal the whole group
      detached: process.platform !== 'win32',
    })

    // Wait for dev server to start
    await new Promise((r) => setTimeout(r, 6000))

    // Dev server should still be running
    expect(devServer.pid).toBeTruthy()
    expect(isRunning(devServer.pid!)).toBe(true)

    // Wait a bit more - should still be alive
    await new Promise((r) => setTimeout(r, 2000))
    expect(isRunning(devServer.pid!)).toBe(true)

    // Clean up (tree-kill so dev-server workers don't orphan)
    await killProcessTree(devServer.pid)
  }, 15000)
})

// Pins the cross-platform tree-kill contract that killProcessTree (./process-tree,
// and packages/test/src/setup.ts) relies on. The mechanisms differ by platform, so
// each gets a positive (the whole tree is reaped) and a negative (a bare single-PID
// kill leaves a worker orphaned — i.e. why a plain process.kill is not enough):
//   - Windows: process.kill(pid) is TerminateProcess and does not walk the tree; a
//     worker that broke away from libuv's job object (detached) survives it, while
//     taskkill /F /T walks the PID tree and reaps it.
//   - POSIX: process.kill(pid) signals only the leader; killProcessTree signals the
//     whole process group (negative pid), so the workers it forked go too.
describe('process tree termination', () => {
  const spawnedPids: number[] = []

  afterEach(() => {
    // safety net: force-kill anything a test spawned, even if it failed mid-way
    for (const pid of spawnedPids) {
      try {
        if (process.platform === 'win32') {
          spawn('taskkill', ['/F', '/T', '/PID', String(pid)], { stdio: 'ignore' })
        } else {
          try {
            process.kill(-pid, 'SIGKILL')
          } catch {
            // not a group leader
          }
          try {
            process.kill(pid, 'SIGKILL')
          } catch {
            // already gone
          }
        }
      } catch {
        // already gone
      }
    }
    spawnedPids.length = 0
  })

  // Spawn a server -> worker tree, resolving once the worker PID is known. The
  // server is a group leader on POSIX (detached) so killProcessTree's group-kill
  // reaches the worker; on Windows detached is irrelevant to taskkill /T. The
  // worker is spawned detached only when we want it to escape the parent's job
  // object / process group (the case a single-process kill cannot clean up).
  function spawnTree(
    detachedWorker: boolean
  ): Promise<{ server: ChildProcess; workerPid: number }> {
    const server = spawn(
      'node',
      [
        '-e',
        `
        const { spawn } = require('child_process')
        const worker = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
          detached: ${detachedWorker},
          stdio: 'ignore',
        })
        ${detachedWorker ? 'worker.unref()' : ''}
        process.stdout.write('WORKER_PID=' + worker.pid + '\\n')
        setInterval(() => {}, 1000)
        `,
      ],
      { stdio: ['ignore', 'pipe', 'ignore'], detached: process.platform !== 'win32' }
    )
    return new Promise((resolve) => {
      let out = ''
      server.stdout?.on('data', (d) => {
        out += d.toString()
        const match = out.match(/WORKER_PID=(\d+)\r?\n/)
        if (match) {
          const workerPid = Number(match[1])
          if (server.pid) spawnedPids.push(server.pid)
          spawnedPids.push(workerPid)
          resolve({ server, workerPid })
        }
      })
    })
  }

  test.skipIf(process.platform !== 'win32')(
    'killProcessTree reaps a detached worker that escaped the job object (Windows)',
    async () => {
      const { server, workerPid } = await spawnTree(true)
      expect(server.pid).toBeTruthy()
      expect(isRunning(server.pid!)).toBe(true)
      expect(isRunning(workerPid)).toBe(true)

      await killProcessTree(server.pid)
      await new Promise((r) => setTimeout(r, 2000))

      expect(isRunning(server.pid!)).toBe(false)
      expect(isRunning(workerPid)).toBe(false)
    },
    15000
  )

  test.skipIf(process.platform !== 'win32')(
    'a bare process.kill orphans a detached worker on Windows (why tree-kill is needed)',
    async () => {
      const { server, workerPid } = await spawnTree(true)
      expect(isRunning(workerPid)).toBe(true)

      // TerminateProcess does not walk the tree, and the detached worker broke away
      // from the job object — so it survives as an orphan
      process.kill(server.pid!, 'SIGKILL')
      await new Promise((r) => setTimeout(r, 2000))

      expect(isRunning(server.pid!)).toBe(false)
      expect(isRunning(workerPid)).toBe(true)
      // (afterEach reaps the orphaned worker)
    },
    15000
  )

  test.skipIf(process.platform === 'win32')(
    'killProcessTree reaps an in-group worker (POSIX group-kill)',
    async () => {
      const { server, workerPid } = await spawnTree(false)
      expect(server.pid).toBeTruthy()
      expect(isRunning(server.pid!)).toBe(true)
      expect(isRunning(workerPid)).toBe(true)

      await killProcessTree(server.pid)
      await new Promise((r) => setTimeout(r, 2000))

      expect(isRunning(server.pid!)).toBe(false)
      expect(isRunning(workerPid)).toBe(false)
    },
    15000
  )

  test.skipIf(process.platform === 'win32')(
    'a bare single-process kill orphans an in-group worker (POSIX, why tree-kill is needed)',
    async () => {
      const { server, workerPid } = await spawnTree(false)
      expect(isRunning(workerPid)).toBe(true)

      // signalling only the leader's PID leaves the rest of the group running
      process.kill(server.pid!, 'SIGKILL')
      await new Promise((r) => setTimeout(r, 2000))

      expect(isRunning(server.pid!)).toBe(false)
      expect(isRunning(workerPid)).toBe(true)
      // (afterEach reaps the orphaned worker)
    },
    15000
  )
})
