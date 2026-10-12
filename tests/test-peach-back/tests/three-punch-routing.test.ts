import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const START_TIMEOUT = 60000

async function waitForPath(page: Page, pathname: string) {
  await page.waitForFunction((expected) => location.pathname === expected, pathname, {
    timeout: 10000,
  })
}

async function clickSeedThread(page: Page) {
  await page.locator('#seed-thread-link').click()
  await waitForPath(page, '/thread/seed-thread-001')
  await page.locator('#thread-screen').waitFor({ timeout: 10000 })
}

async function rootRouteNames(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__oneDevtools?.rootState
    return state?.routes?.map((route: { name: string }) => route.name) ?? []
  })
}

async function expectDevRootRouteNames(page: Page, names: string[]) {
  if (process.env.TEST_ONLY !== 'dev') return
  expect(await rootRouteNames(page)).toEqual(names)
}

describe('three punch grouped route navigation', () => {
  let browser: Browser
  let context: BrowserContext

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext()
  })

  afterAll(async () => {
    await context?.close()
    await browser?.close()
  })

  it(
    'clicking a forum thread pushes one browser entry; back returns to forum',
    async () => {
      const page = await context.newPage()
      const serverUrl = process.env.ONE_SERVER_URL!

      await page.goto(`${serverUrl}/forum`, { waitUntil: 'networkidle' })
      await page.locator('#forum-screen').waitFor({ timeout: 10000 })

      await page.evaluate(() => {
        const originalPush = history.pushState.bind(history)
        const originalReplace = history.replaceState.bind(history)
        ;(window as any).__historyLog = [] as {
          op: 'push' | 'replace'
          url: string | URL | null | undefined
        }[]
        history.pushState = function (...args: Parameters<typeof history.pushState>) {
          ;(window as any).__historyLog.push({ op: 'push', url: args[2] })
          return originalPush(...args)
        } as any
        history.replaceState = function (
          ...args: Parameters<typeof history.replaceState>
        ) {
          ;(window as any).__historyLog.push({ op: 'replace', url: args[2] })
          return originalReplace(...args)
        } as any
      })

      const beforeLength = await page.evaluate(() => history.length)

      await clickSeedThread(page)

      const historyLog = await page.evaluate(
        () =>
          (window as any).__historyLog as {
            op: 'push' | 'replace'
            url: string | URL | null | undefined
          }[]
      )
      const threadPushes = historyLog.filter(
        (entry) => entry.op === 'push' && entry.url === '/thread/seed-thread-001'
      )
      expect(
        threadPushes.length,
        `expected clicking the forum thread to push /thread/seed-thread-001.\n` +
          `history log: ${JSON.stringify(historyLog, null, 2)}`
      ).toBe(1)

      const afterLength = await page.evaluate(() => history.length)
      expect(
        afterLength,
        `thread navigation should add one browser history entry.\n` +
          `history log: ${JSON.stringify(historyLog, null, 2)}`
      ).toBe(beforeLength + 1)

      await page.goBack()
      await waitForPath(page, '/forum')
      await page.locator('#forum-screen').waitFor({ timeout: 10000 })

      await page.close()
    },
    START_TIMEOUT
  )

  it(
    'navigates from a dynamic thread route to grouped static siblings repeatedly',
    async () => {
      const page = await context.newPage()
      const serverUrl = process.env.ONE_SERVER_URL!

      await page.goto(`${serverUrl}/forum`, { waitUntil: 'networkidle' })
      await page.locator('#forum-screen').waitFor({ timeout: 10000 })

      await clickSeedThread(page)

      await page.locator('#nav-rankings').click()
      await waitForPath(page, '/forum/rankings')
      await page.locator('#rankings-screen').waitFor({ timeout: 10000 })

      await page.locator('#nav-forum').click()
      await waitForPath(page, '/forum')
      await page.locator('#forum-screen').waitFor({ timeout: 10000 })
      await expectDevRootRouteNames(page, ['(auth)'])

      await clickSeedThread(page)

      await page.locator('#nav-picks').click()
      await waitForPath(page, '/picks')
      await page.locator('#picks-screen').waitFor({ timeout: 10000 })

      await page.close()
    },
    START_TIMEOUT
  )
})
