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
  const getTexts = async (...testIds: string[]) => {
    const source = await driver.getPageSource()
    return Object.fromEntries(
      testIds.map((testId) => {
        const nameIndex = source.indexOf(`name="${testId}"`)
        if (nameIndex === -1) return [testId, undefined]
        const elementStart = source.lastIndexOf('<', nameIndex)
        const elementEnd = source.indexOf('>', nameIndex)
        const value =
          elementEnd === -1
            ? undefined
            : source.slice(elementStart, elementEnd).match(/\bvalue="([^"]*)"/)?.[1]
        return [testId, value]
      })
    ) as Record<string, string | undefined>
  }
  const waitForTexts = async (expected: Record<string, string | RegExp | undefined>) => {
    let texts: Record<string, string | undefined> = {}
    try {
      await driver.waitUntil(
        async () => {
          try {
            texts = await getTexts(...Object.keys(expected))
            return Object.entries(expected).every(([testId, expectedText]) =>
              expectedText instanceof RegExp
                ? expectedText.test(texts[testId] ?? '')
                : texts[testId] === expectedText
            )
          } catch {
            await assertAppRunning(driver)
            return false
          }
        },
        {
          timeout: 30_000,
          interval: 500,
          timeoutMsg: `Text did not update: ${Object.entries(expected)
            .map(([testId, expectedText]) => `${testId}=${String(expectedText)}`)
            .join(', ')}`,
        }
      )
    } catch (e) {
      const seen = Object.entries(texts)
        .map(([testId, text]) => `${testId}=${String(text)}`)
        .join(', ')
      throw new Error(
        `Text did not update: ${Object.entries(expected)
          .map(([testId, expectedText]) => `${testId}=${String(expectedText)}`)
          .join(', ')} (last seen: ${seen || 'nothing'})`,
        { cause: e }
      )
    }
    return texts
  }
  return { waitForTexts }
}

testRolldownDev(
  'applies route, component and workspace Fast Refresh updates without re-running the route module',
  { timeout: 5 * 60 * 1000, retry: 0 },
  async () => {
    const originalRoute = await readFile(routePath, 'utf8')
    const originalChild = await readFile(childPath, 'utf8')
    const originalWorkspace = await readFile(workspacePath, 'utf8')
    const driver = await createSession(getWebDriverConfig())
    const { waitForTexts } = createTextReaders(driver)

    try {
      await navigateTo(driver, '/hmr-probe')
      const initialTexts = await waitForTexts({
        'route-hmr-version': 'route-v1',
        'route-hmr-added': 'missing',
        'component-hmr-version': 'component-v1',
        'workspace-hmr-version': 'workspace-v1',
        'route-hmr-generation': /^generation:\d+$/,
      })

      // the route module bumps this on every evaluation, so holding it steady
      // across each edit is what says the update was patched into the running
      // module graph rather than delivered by restarting the app. the route's
      // own useState would reset with it.
      const generation = initialTexts['route-hmr-generation']
      expect(generation).toMatch(/^generation:\d+$/)

      // the server only sends a patch to sockets connected at that moment,
      // with no replay for a session that connects late. an edit that lands
      // before this session's HMR socket is up is therefore dropped silently
      // and flakes the assertions below on slow machines. prove a patch
      // round-trips (generation steady rules out a reload) before measuring.
      await writeFile(
        childPath,
        originalChild.replace('component-v1', 'hmr-session-ready')
      )
      await waitForTexts({
        'component-hmr-version': 'hmr-session-ready',
        'route-hmr-generation': generation,
      })
      await writeFile(childPath, originalChild)
      await waitForTexts({
        'component-hmr-version': 'component-v1',
        'route-hmr-generation': generation,
      })

      await writeFile(childPath, originalChild.replace('component-v1', 'component-v2'))
      await waitForTexts({
        'component-hmr-version': 'component-v2',
        'route-hmr-generation': generation,
      })

      await writeFile(routePath, originalRoute.replace('route-v1', 'route-v2'))
      await waitForTexts({
        'route-hmr-version': 'route-v2',
        'route-hmr-generation': generation,
      })

      await writeFile(
        workspacePath,
        originalWorkspace.replace('workspace-v1', 'workspace-v2')
      )
      await waitForTexts({
        'workspace-hmr-version': 'workspace-v2',
        'route-hmr-generation': generation,
      })
    } finally {
      await Promise.all([
        writeFile(routePath, originalRoute),
        writeFile(childPath, originalChild),
        writeFile(workspacePath, originalWorkspace),
      ])
      try {
        await waitForTexts({
          'route-hmr-version': 'route-v1',
          'component-hmr-version': 'component-v1',
          'workspace-hmr-version': 'workspace-v1',
        })
      } finally {
        await closeSession(driver)
      }
    }
  }
)

testRolldownDev(
  'a route file created while the app runs becomes reachable',
  { timeout: 5 * 60 * 1000, retry: 0 },
  async () => {
    const originalChild = await readFile(childPath, 'utf8')
    const driver = await createSession(getWebDriverConfig())
    const { waitForTexts } = createTextReaders(driver)

    try {
      await navigateTo(driver, '/hmr-probe')
      await waitForTexts({ 'route-hmr-version': 'route-v1' })

      // the app can paint before its HMR socket finishes connecting. prove this
      // session is registered before changing route membership, so the route
      // rebuild tests reload delivery instead of racing connection startup.
      await writeFile(
        childPath,
        originalChild.replace('component-v1', 'route-session-ready')
      )
      await waitForTexts({ 'component-hmr-version': 'route-session-ready' })
      await writeFile(childPath, originalChild)
      await waitForTexts({ 'component-hmr-version': 'component-v1' })

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

      // a route-map rebuild reloads the app at its root. wait for that root
      // before navigating again so an interaction cannot race the reload and
      // land on a screen from the old route map.
      await waitForTexts({ 'welcome-message': 'Welcome to One' })
      await navigateTo(driver, '/hmr-probe')
      await waitForTexts({ 'route-hmr-added': 'available' })
      await navigateTo(driver, '/hmr-added')
      await waitForTexts({ 'added-route-version': 'added-v1' })
    } finally {
      await Promise.all([
        rm(addedRoutePath, { force: true }),
        writeFile(childPath, originalChild),
      ])
      try {
        // deleting a route rebuilds the route map. prove the updated bundle
        // mounted before ending this session so no later test inherits a
        // half-finished rebuild.
        await waitForTexts({ 'added-route-version': undefined })
        await navigateTo(driver, '/hmr-probe')
        await waitForTexts({
          'route-hmr-version': 'route-v1',
          'route-hmr-added': 'missing',
        })
      } finally {
        await closeSession(driver)
      }
    }
  }
)
