import { spawn, type ChildProcess } from 'node:child_process'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import getPort from 'get-port'
import { describe, expect, it } from 'vitest'

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
    proc.kill('SIGTERM')
    setTimeout(() => {
      try {
        proc.kill('SIGKILL')
      } catch {}
    }, 1000)
  }
}

/**
 * Test that Metro initialization happens AFTER Vite server is fully started.
 *
 * The issue: Metro logs "Metro bundler ready" before Vite prints server URLs,
 * causing confusing output order.
 *
 * Expected log order:
 *   1. "Server running on" (Vite is listening)
 *   2. "Metro bundler ready" (Metro finishes init)
 *
 * Current broken order:
 *   1. "Metro bundler ready"
 *   2. "Server running on"
 */
describe('Metro startup order', () => {
  it('should log Metro ready AFTER Vite server URLs are printed', async () => {
    const port = await getPort()
    let allOutput = ''
    let viteReadyPos = -1
    let metroReadyPos = -1

    const devServer = spawn('node', [oneRunEntry, 'dev', '--port', port.toString()], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        // Enable Metro mode
        ONE_METRO_MODE: '1',
        // Enable debug logging to see Metro ready message
        DEBUG: 'vxrn:*',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    const collectLogs = (data: Buffer) => {
      const text = data.toString()
      const prevLength = allOutput.length
      allOutput += text

      // Track position of each message in the combined output
      if (viteReadyPos === -1) {
        const idx = allOutput.indexOf('Server running on')
        if (idx !== -1) viteReadyPos = idx
      }
      if (metroReadyPos === -1) {
        const idx = allOutput.indexOf('Metro bundler ready')
        if (idx !== -1) metroReadyPos = idx
      }
    }

    devServer.stdout?.on('data', collectLogs)
    devServer.stderr?.on('data', collectLogs)

    // Wait for both messages to appear or timeout
    const timeout = 60_000
    const startTime = Date.now()

    await new Promise<void>((resolve, reject) => {
      const checkDone = setInterval(() => {
        if (viteReadyPos !== -1 && metroReadyPos !== -1) {
          clearInterval(checkDone)
          resolve()
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkDone)
          reject(
            new Error(
              `Timeout waiting for server startup.\n` +
                `viteReadyPos: ${viteReadyPos}, metroReadyPos: ${metroReadyPos}\n` +
                `Logs:\n${allOutput}`
            )
          )
        }
      }, 100)
    })

    // Kill the server (tree-kill on Windows; SIGTERM→SIGKILL on POSIX)
    killTree(devServer)
    await new Promise((r) => setTimeout(r, 500))

    // Verify the order - Vite should be ready BEFORE Metro
    console.info('Output captured:\n', allOutput)
    console.info(`\nviteReadyPos: ${viteReadyPos}, metroReadyPos: ${metroReadyPos}`)

    expect(viteReadyPos).toBeGreaterThan(-1)
    expect(metroReadyPos).toBeGreaterThan(-1)

    // This will FAIL with current code - Metro logs before Vite URLs
    expect(viteReadyPos).toBeLessThan(metroReadyPos)
  }, 90_000)
})
