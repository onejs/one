/**
 * Vitest global setup for Cloudflare testing
 *
 * This setup:
 * 1. Builds the app with deploy: 'cloudflare'
 * 2. Starts the wrangler dev server
 * 3. Provides ONE_SERVER_URL to tests
 * 4. Cleans up on teardown
 */

import { spawn, execSync, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { GlobalSetupContext } from 'vitest/node'

const testDir = process.cwd()
const PORT = 3457
let serverProcess: ChildProcess | null = null

async function waitForServer(url: string, maxRetries = 60): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { method: 'HEAD' })
      if (response.ok || response.status < 500) {
        return true
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }
  return false
}

function killProcessTree(pid: number) {
  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' })
    } else {
      execSync(`kill -9 -${pid} 2>/dev/null || kill -9 ${pid}`, { stdio: 'ignore' })
    }
  } catch {}
}

export async function setup({ provide }: GlobalSetupContext) {
  console.log('[test-cloudflare] Starting setup...')

  // Skip build if SKIP_BUILD is set (useful for debugging)
  if (!process.env.SKIP_BUILD) {
    console.log('[test-cloudflare] Building with Cloudflare deploy target...')

    try {
      execSync('yarn build:web', {
        cwd: testDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          ONE_SERVER_URL: `http://localhost:${PORT}`,
        },
      })
    } catch (err) {
      console.error('[test-cloudflare] Build failed:', err)
      throw err
    }
  }

  // Verify build output exists
  const workerFile = join(testDir, 'dist', 'worker.js')
  if (!existsSync(workerFile)) {
    throw new Error(`Cloudflare worker not found at ${workerFile}`)
  }

  console.log('[test-cloudflare] Starting wrangler dev server...')

  // Start the wrangler dev server
  serverProcess = spawn(
    'npx',
    ['wrangler', 'dev', 'dist/worker.js', '--port', String(PORT), '--config', join(testDir, 'dist', 'wrangler.jsonc')],
    {
      cwd: testDir,
      stdio: 'inherit',
      detached: true,
      env: {
        ...process.env,
      },
    }
  )

  serverProcess.unref()

  // Wait for server to be ready
  const serverUrl = `http://localhost:${PORT}`
  const ready = await waitForServer(serverUrl)

  if (!ready) {
    throw new Error(`Cloudflare wrangler server failed to start at ${serverUrl}`)
  }

  console.log(`[test-cloudflare] Server ready at ${serverUrl}`)

  // Set environment variable for tests
  process.env.ONE_SERVER_URL = serverUrl

  // Provide test info to vitest context
  provide('testInfo', {
    testDir,
    serverUrl,
  })
}

export async function teardown() {
  console.log('[test-cloudflare] Tearing down...')

  if (serverProcess?.pid) {
    killProcessTree(serverProcess.pid)
  }
}

declare module 'vitest' {
  export interface ProvidedContext {
    testInfo: {
      testDir: string
      serverUrl: string
    }
  }
}
