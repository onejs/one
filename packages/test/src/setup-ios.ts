import type { TestProject } from 'vitest/node'
import type { Assertion } from 'vitest'
import { setupTestServers, type TestInfo } from './setupTest'
import { setup as defaultSetup, teardown as defaultTeardown } from './setup'
import { getWebDriverConfig, type WebdriverIOConfig } from './internal-utils/ios'

// to keep the import which is needed for declare
const y: Assertion = 0 as any

declare module 'vitest' {
  export interface ProvidedContext {
    webDriverConfig: WebdriverIOConfig
  }
}

export async function setup(project: TestProject) {
  process.env.IS_NATIVE_TEST = 'true' // TODO: maybe need a better way to skip building the web app since we don't need it for native tests
  await defaultSetup(project)
  const webDriverConfig = await getWebDriverConfig()
  project.provide('webDriverConfig', webDriverConfig)
}

export const teardown = async () => {
  await defaultTeardown()
}
