// TEMP-LOCAL diagnostic: timeline the client side of native route HMR.
// Run: same env as hmr-fast-refresh.test.ios.ts, this file only. DELETE BEFORE PUSH.
import { readFile, rm, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { closeSession, createSession, navigateTo } from '@vxrn/test/utils/appium'
import { test } from 'vitest'

const addedRoutePath = resolve('app/hmr-added.tsx')

async function getTexts(driver: any, ...testIds: string[]) {
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
  )
}

test(
  'TEMP probe route hmr timeline',
  { timeout: 5 * 60 * 1000, retry: 0 },
  async () => {
    const driver = await createSession(getWebDriverConfig())
    const t0 = Date.now()
    const now = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`
    try {
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await navigateTo(driver, '/hmr-probe')
          break
        } catch (error) {
          console.log(`[${now()}] navigate attempt ${attempt} failed: ${(error as Error).message}`)
          if (attempt === 2) throw error
          await driver.pause(5000)
        }
      }
      console.log(`[${now()}] navigated to /hmr-probe`)
      const before = await getTexts(
        driver,
        'route-hmr-version',
        'route-hmr-generation',
        'route-hmr-added',
        'welcome-message'
      )
      console.log(`[${now()}] before=${JSON.stringify(before)}`)

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
      console.log(`[${now()}] file created`)

      for (let i = 0; i < 20; i++) {
        await driver.pause(2000)
        const texts = await getTexts(
          driver,
          'route-hmr-version',
          'route-hmr-generation',
          'route-hmr-added',
          'welcome-message',
          'added-route-version'
        )
        console.log(`[${now()}] poll=${JSON.stringify(texts)}`)
        if (texts['welcome-message'] === 'Welcome to One') {
          console.log(`[${now()}] WELCOME VISIBLE`)
          break
        }
      }

      await navigateTo(driver, '/hmr-probe')
      const afterProbe = await getTexts(driver, 'route-hmr-added', 'route-hmr-generation')
      console.log(`[${now()}] back on probe=${JSON.stringify(afterProbe)}`)
      await navigateTo(driver, '/hmr-added')
      const afterAdded = await getTexts(driver, 'added-route-version')
      console.log(`[${now()}] on added=${JSON.stringify(afterAdded)}`)
    } finally {
      await rm(addedRoutePath, { force: true })
      await closeSession(driver)
    }
  }
)
