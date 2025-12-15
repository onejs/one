import { spawn } from 'node:child_process'
import getPort from 'get-port'
import { describe, expect, it } from 'vitest'

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

    const devServer = spawn(
      'node',
      ['../../node_modules/.bin/one', 'dev', '--port', port.toString()],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          // Enable Metro mode
          ONE_METRO_MODE: '1',
          // Enable debug logging to see Metro ready message
          DEBUG: 'vxrn:*',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

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

    // Kill the server
    devServer.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 500))
    devServer.kill('SIGKILL')

    // Verify the order - Vite should be ready BEFORE Metro
    console.info('Output captured:\n', allOutput)
    console.info(`\nviteReadyPos: ${viteReadyPos}, metroReadyPos: ${metroReadyPos}`)

    expect(viteReadyPos).toBeGreaterThan(-1)
    expect(metroReadyPos).toBeGreaterThan(-1)

    // This will FAIL with current code - Metro logs before Vite URLs
    expect(viteReadyPos).toBeLessThan(metroReadyPos)
  }, 90_000)
})
