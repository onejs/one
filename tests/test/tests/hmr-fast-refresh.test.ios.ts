import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, navigateTo } from '@vxrn/test/utils/appium'
import { expect, test } from 'vitest'

const routePath = resolve('app/hmr-probe.tsx')
const childPath = resolve('features/hmr/HmrProbeChild.tsx')
const testRolldownDev =
  process.env.ONE_NATIVE_BUNDLER === 'rolldown' && process.env.TEST_ENV === 'dev'
    ? test
    : test.skip

testRolldownDev(
  'applies route and component Fast Refresh updates on native',
  { timeout: 5 * 60 * 1000, retry: 1 },
  async () => {
    const originalRoute = await readFile(routePath, 'utf8')
    const originalChild = await readFile(childPath, 'utf8')
    const driver = await createSession(getWebDriverConfig())

    const getText = async (testId: string) => {
      const source = await driver.getPageSource()
      const nameIndex = source.indexOf(`name="${testId}"`)
      if (nameIndex === -1) return
      const elementStart = source.lastIndexOf('<', nameIndex)
      const elementEnd = source.indexOf('>', nameIndex)
      if (elementEnd === -1) return
      return source.slice(elementStart, elementEnd).match(/\bvalue="([^"]*)"/)?.[1]
    }
    const waitForText = async (testId: string, expected: string) => {
      await driver.waitUntil(
        async () => {
          try {
            return (await getText(testId)) === expected
          } catch {
            return false
          }
        },
        {
          timeout: 30_000,
          interval: 500,
          timeoutMsg: `${testId} did not update to ${expected}`,
        }
      )
    }

    try {
      await navigateTo(driver, '/hmr-probe')
      await waitForText('route-hmr-version', 'route-v1')
      await waitForText('component-hmr-version', 'component-v1')
      const initialGeneration = Number(
        (await getText('route-hmr-generation'))?.replace('generation:', '')
      )
      expect(initialGeneration).toBeGreaterThan(0)
      await driver.pause(2_000)

      await writeFile(childPath, originalChild.replace('component-v1', 'component-v2'))
      await waitForText('component-hmr-version', 'component-v2')
      expect(await getText('route-hmr-generation')).toBe(
        `generation:${initialGeneration}`
      )

      await writeFile(routePath, originalRoute.replace('route-v1', 'route-v2'))
      await waitForText('route-hmr-version', 'route-v2')
      await waitForText('route-hmr-generation', `generation:${initialGeneration + 1}`)
    } finally {
      await Promise.all([
        writeFile(routePath, originalRoute),
        writeFile(childPath, originalChild),
      ])
      await driver.deleteSession()
    }
  }
)
