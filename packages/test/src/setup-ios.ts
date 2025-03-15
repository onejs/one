import type { TestProject } from 'vitest/node'
import type { Assertion } from 'vitest'
import { setupTestServers, type TestInfo } from './setupTest'
import { setup as defaultSetup, teardown as defaultTeardown } from './setup'
import { getWebDriverConfig, type WebdriverIOConfig } from './utils/ios'

// to keep the import which is needed for declare
const y: Assertion = 0 as any

declare module 'vitest' {
  export interface ProvidedContext {
    webDriverConfig: WebdriverIOConfig
  }
}

export async function setup(project: TestProject) {
  await defaultSetup(project)
  const webDriverConfig = await getWebDriverConfig()
  project.provide('webDriverConfig', webDriverConfig)
}

export const teardown = async () => {
  await defaultTeardown()
}
