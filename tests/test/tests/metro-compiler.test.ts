import { spawn, type ChildProcess } from 'node:child_process'
import getPort from 'get-port'
import { describe, expect, it, afterEach } from 'vitest'

/**
 * Test that the React compiler works through the Metro bundling path.
 *
 * The issue: enabling `reactCompiler` causes `useMemoCache` to be null
 * at runtime on native because the compiler-runtime isn't properly
 * available or React internals aren't initialized.
 *
 * This test:
 *   1. Starts a dev server with Metro mode
 *   2. Waits for Metro to be ready
 *   3. Requests the Metro bundle
 *   4. Verifies the bundle builds successfully
 *   5. Checks that compiler-runtime is resolved in the bundle
 *   6. Checks that useMemoCache is available
 */
describe('Metro React compiler', () => {
  let devServer: ChildProcess | null = null

  afterEach(() => {
    if (devServer) {
      devServer.kill('SIGTERM')
      setTimeout(() => devServer?.kill('SIGKILL'), 1000)
      devServer = null
    }
  })

  it('should bundle successfully with react compiler enabled', async () => {
    const port = await getPort()
    let allOutput = ''
    let viteReady = false
    let metroReady = false
    let processExited = false

    devServer = spawn(
      'node',
      ['../../node_modules/.bin/one', 'dev', '--port', port.toString()],
      {
        cwd: process.cwd(),
        env: {
          ...process.env,
          DEBUG: 'vxrn:*,vite-plugin-metro:*',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

    devServer.on('exit', (code) => {
      processExited = true
    })

    const collectLogs = (data: Buffer) => {
      const text = data.toString()
      allOutput += text
      if (!viteReady && allOutput.includes('Server running on')) {
        viteReady = true
      }
      if (!metroReady && allOutput.includes('Metro bundler ready')) {
        metroReady = true
      }
    }

    devServer.stdout?.on('data', collectLogs)
    devServer.stderr?.on('data', collectLogs)

    // wait for both vite and metro to be ready
    const timeout = 90_000
    const startTime = Date.now()

    await new Promise<void>((resolve, reject) => {
      const check = setInterval(() => {
        if (viteReady && metroReady) {
          clearInterval(check)
          resolve()
        } else if (processExited) {
          clearInterval(check)
          reject(new Error(`Dev server exited before ready.\nLogs:\n${allOutput}`))
        } else if (Date.now() - startTime > timeout) {
          clearInterval(check)
          reject(
            new Error(
              `Timeout. viteReady: ${viteReady}, metroReady: ${metroReady}\n` +
                `Logs:\n${allOutput.slice(-2000)}`
            )
          )
        }
      }, 200)
    })

    // request the metro bundle via expo's virtual entry
    const bundleUrl = `http://127.0.0.1:${port}/.expo/.virtual-metro-entry.bundle?platform=ios&dev=true&hot=false&lazy=true`
    const response = await fetch(bundleUrl, {
      headers: { Accept: 'application/javascript' },
      signal: AbortSignal.timeout(120_000),
    })

    expect(response.status).toBe(200)

    const bundle = await response.text()

    // bundle should be substantial (full RN app)
    expect(bundle.length).toBeGreaterThan(10_000)

    // compiler-runtime must be resolved in the bundle
    // babel-plugin-react-compiler generates imports to react/compiler-runtime
    expect(bundle).toContain('compiler-runtime')

    // useMemoCache must be defined (this is the function that was null in the bug)
    expect(bundle).toContain('useMemoCache')

    // should not contain module resolution errors for compiler-runtime specifically
    expect(bundle).not.toContain("Cannot find module 'react/compiler-runtime'")
    expect(bundle).not.toContain('Unable to resolve module react/compiler-runtime')
  }, 300_000)
})
