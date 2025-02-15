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
   * When running tests locally, sometimes it’s more convenient to run your own dev server manually instead of having the test framework managing it for you. For example, it’s more easy to see the server logs, or you won’t have to wait for another dev server to start if you’re already running one.
   */
  const urlOfDevServerWhichIsAlreadyRunning = process.env.DEV_SERVER_URL

  testInfo = await setupTestServers({ skipDev: !!urlOfDevServerWhichIsAlreadyRunning })

  console.info(`setting up tests`, testInfo)

  process.env.ONE_SERVER_URL =
    urlOfDevServerWhichIsAlreadyRunning ||
    `http://localhost:${testInfo.devServerPid ? testInfo.testDevPort : testInfo.testProdPort}`

  project.provide('testInfo', testInfo)
}

export const teardown = async () => {
  if (!testInfo) return

  if (testInfo.devServerPid) {
    try {
      process.kill(testInfo.devServerPid)
      console.info(`Dev server process (PID: ${testInfo.devServerPid}) killed successfully.`)
    } catch (error) {
      console.error(`Failed to kill dev server process (PID: ${testInfo.devServerPid}):`, error)
    }
  }

  if (testInfo.prodServerPid) {
    try {
      process.kill(testInfo.prodServerPid)
      console.info(`Prod server process (PID: ${testInfo.prodServerPid}) killed successfully.`)
    } catch (error) {
      console.error(`Failed to kill prod server process (PID: ${testInfo.prodServerPid}):`, error)
    }
  }

  if (testInfo.buildPid) {
    try {
      process.kill(testInfo.buildPid)
      console.info(`Build process (PID: ${testInfo.buildPid}) killed successfully.`)
    } catch (error) {
      console.error(`Failed to kill build process (PID: ${testInfo.buildPid}):`, error)
    }
  }
}
