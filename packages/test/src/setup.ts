import type { TestProject } from 'vitest/node'
import type { Assertion } from 'vitest'
import { setupTestServers, type TestInfo } from './setupTest'

// to keep the import which is needed for declare
const y: Assertion = 0 as any

declare module 'vitest' {
  export interface ProvidedContext {
    testInfo: TestInfo
  }
}

let testInfo: TestInfo | null = null

export async function setup(project: TestProject) {
  /**
   * When running tests locally, sometimes it's more convenient to run your own dev server manually instead of having the test framework managing it for you. For example, it's more easy to see the server logs, or you won't have to wait for another dev server to start if you're already running one.
   */
  const urlOfDevServerWhichIsAlreadyRunning = process.env.DEV_SERVER_URL

  testInfo = await setupTestServers({ skipDev: !!urlOfDevServerWhichIsAlreadyRunning })

  console.info(`setting up tests`, testInfo)

  process.env.ONE_SERVER_URL =
    urlOfDevServerWhichIsAlreadyRunning ||
    `http://localhost:${testInfo.devServerPid ? testInfo.testDevPort : testInfo.testProdPort}`

  project.provide('testInfo', testInfo)
}

// Kill a process group (for detached processes) or process tree
async function killProcessTree(pid: number, name: string): Promise<void> {
  try {
    // for detached processes, kill the entire process group using negative pid
    try {
      process.kill(-pid, 'SIGTERM')
    } catch {
      // fallback to killing individual process if process group kill fails
      process.kill(pid, 'SIGTERM')
    }

    // wait for graceful shutdown
    await new Promise((r) => setTimeout(r, 200))

    // force kill with SIGKILL
    try {
      process.kill(-pid, 'SIGKILL')
    } catch {
      try {
        process.kill(pid, 'SIGKILL')
      } catch {
        // process may already be gone
      }
    }

    console.info(`${name} process (PID: ${pid}) killed successfully.`)
  } catch (error) {
    // process may already be gone, which is fine
    if ((error as NodeJS.ErrnoException).code !== 'ESRCH') {
      console.error(`Error killing ${name} process tree for ${pid}: ${error}`)
    }
  }
}

export const teardown = async () => {
  if (!testInfo) return

  // Kill process trees to ensure all child processes are terminated
  const killPromises: Promise<void>[] = []

  if (testInfo.devServerPid) {
    killPromises.push(killProcessTree(testInfo.devServerPid, 'Dev server'))
  }

  if (testInfo.prodServerPid) {
    killPromises.push(killProcessTree(testInfo.prodServerPid, 'Prod server'))
  }

  if (testInfo.buildPid) {
    killPromises.push(killProcessTree(testInfo.buildPid, 'Build'))
  }

  await Promise.all(killPromises)
}
