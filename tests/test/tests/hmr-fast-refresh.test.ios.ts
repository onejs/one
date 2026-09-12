import { readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getWebDriverConfig } from '@vxrn/test/ios'
import {
  assertAppRunning,
  closeSession,
  createSession,
  navigateTo,
} from '@vxrn/test/utils/appium'
import { expect, test } from 'vitest'

const routePath = resolve('app/hmr-probe.tsx')
const childPath = resolve('features/hmr/HmrProbeChild.tsx')
const workspacePath = resolve('../../packages/test-package/src/hmr-probe-value.js')
const addedRoutePath = resolve('app/hmr-added.tsx')
const testRolldownDev =
  process.env.ONE_NATIVE_BUNDLER === 'rolldown' && process.env.TEST_ENV === 'dev'
    ? test
    : test.skip

function createTextReaders(driver: Awaited<ReturnType<typeof createSession>>) {
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
          await assertAppRunning(driver)
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
  return { getText, waitForText }
}

testRolldownDev(
  'applies route, component and workspace Fast Refresh updates without re-running the route module',
  { timeout: 5 * 60 * 1000, retry: 0 },
  async () => {
    const originalRoute = await readFile(routePath, 'utf8')
    const originalChild = await readFile(childPath, 'utf8')
    const originalWorkspace = await readFile(workspacePath, 'utf8')
    const driver = await createSession(getWebDriverConfig())
    const { getText, waitForText } = createTextReaders(driver)

    try {
      await navigateTo(driver, '/hmr-probe')
      await waitForText('route-hmr-version', 'route-v1')
      await waitForText('route-hmr-added', 'missing')
      await waitForText('component-hmr-version', 'component-v1')
      await waitForText('workspace-hmr-version', 'workspace-v1')

      // the route module bumps this on every evaluation, so holding it steady
      // across each edit is what says the update was patched into the running
      // module graph rather than delivered by restarting the app. the route's
      // own useState would reset with it.
      const generation = await getText('route-hmr-generation')
      expect(generation).toMatch(/^generation:\d+$/)
      await driver.pause(2_000)

      await writeFile(childPath, originalChild.replace('component-v1', 'component-v2'))
      await waitForText('component-hmr-version', 'component-v2')
      expect(await getText('route-hmr-generation')).toBe(generation)

      await writeFile(routePath, originalRoute.replace('route-v1', 'route-v2'))
      await waitForText('route-hmr-version', 'route-v2')
      expect(await getText('route-hmr-generation')).toBe(generation)

      await writeFile(
        workspacePath,
        originalWorkspace.replace('workspace-v1', 'workspace-v2')
      )
      await waitForText('workspace-hmr-version', 'workspace-v2')
      expect(await getText('route-hmr-generation')).toBe(generation)
    } finally {
      await Promise.all([
        writeFile(routePath, originalRoute),
        writeFile(childPath, originalChild),
        writeFile(workspacePath, originalWorkspace),
      ])
      await closeSession(driver)
    }
  }
)

testRolldownDev(
  'a route file created while the app runs becomes reachable',
  { timeout: 5 * 60 * 1000, retry: 0 },
  async () => {
    const driver = await createSession(getWebDriverConfig())
    const { waitForText } = createTextReaders(driver)

    try {
      await navigateTo(driver, '/hmr-probe')
      await waitForText('route-hmr-version', 'route-v1')

      // rolldown expands `import.meta.glob` when it transforms the module and
      // records no dependency on the globbed directories, so without the dev
      // server rebuilding on a creation this route stays invisible forever
      await writeFile(
        addedRoutePath,
        `import { Text, View } from 'react-native'

export default function HmrAdded() {
  return (
    <View>
      <Text testID="added-route-version">added-v1</Text>
    </View>
  )
}
`
      )

      // the app reloads onto the rebuilt bundle. wait until that bundle's
      // route map contains the new file before asking the router to enter it;
      // navigating earlier would intentionally select the catch-all route.
      await waitForText('route-hmr-added', 'available')
      await navigateTo(driver, '/hmr-added')
      await waitForText('added-route-version', 'added-v1')
    } finally {
      await rm(addedRoutePath, { force: true })
      try {
        // deleting a route replaces the rolldown engine. prove the replacement
        // bundle mounted before ending this session so no later test inherits a
        // half-finished rebuild.
        await navigateTo(driver, '/hmr-probe')
        await waitForText('route-hmr-version', 'route-v1')
        await waitForText('route-hmr-added', 'missing')
      } finally {
        await closeSession(driver)
      }
    }
  }
)
