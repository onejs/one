import testSetup, { type TestInfo } from './_setup'
import type { GlobalSetupContext } from 'vitest/node'

declare module 'vitest' {
  interface ProvidedContext {
    testInfo: TestInfo
  }
}

let testInfo: TestInfo | null = null

export async function setup({ provide }: GlobalSetupContext) {
  testInfo = await testSetup()
  provide('testInfo', testInfo)
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

  return
}
