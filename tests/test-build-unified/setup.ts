/**
 * Vitest global setup for the unified build mode fixture.
 *
 * Builds the app with build.server.unified: true, boots wrangler dev
 * against the resulting worker, and exposes ONE_SERVER_URL to tests.
 */

import { spawn, execSync, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { GlobalSetupContext } from 'vitest/node'

const testDir = process.cwd()
const PORT = 3458
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
  console.log('[test-build-unified] Starting setup...')

  if (!process.env.SKIP_BUILD) {
    console.log('[test-build-unified] Building with unified mode + cloudflare...')
    try {
      execSync('bun run build:web', {
        cwd: testDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'production',
          ONE_SERVER_URL: `http://localhost:${PORT}`,
        },
      })
    } catch (err) {
      console.error('[test-build-unified] Build failed:', err)
      throw err
    }
  }

  try {
    execSync(`bun kill-my-port ${PORT}`)
  } catch {}

  const workerFile = join(testDir, 'dist', 'worker.js')
  if (!existsSync(workerFile)) {
    throw new Error(`worker not found at ${workerFile}`)
  }

  console.log('[test-build-unified] Starting wrangler dev server...')
  serverProcess = spawn(
    'bunx',
    [
      'wrangler',
      'dev',
      'dist/worker.js',
      '--port',
      String(PORT),
      '--config',
      join(testDir, 'dist', 'wrangler.jsonc'),
    ],
    {
      cwd: testDir,
      stdio: 'inherit',
      detached: true,
      env: { ...process.env },
    }
  )

  serverProcess.unref()

  const serverUrl = `http://localhost:${PORT}`
  const ready = await waitForServer(serverUrl)
  if (!ready) {
    throw new Error(`wrangler server failed to start at ${serverUrl}`)
  }

  console.log(`[test-build-unified] Server ready at ${serverUrl}`)
  process.env.ONE_SERVER_URL = serverUrl
  provide('testInfo', { testDir, serverUrl })
}

export async function teardown() {
  console.log('[test-build-unified] Tearing down...')
  if (serverProcess?.pid) {
    killProcessTree(serverProcess.pid)
  }
  console.log('[test-build-unified] Force exiting')
  process.exit(0)
}

declare module 'vitest' {
  export interface ProvidedContext {
    testInfo: {
      testDir: string
      serverUrl: string
    }
  }
}
