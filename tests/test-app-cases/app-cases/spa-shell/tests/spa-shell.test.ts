import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, expect, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

// --- static html checks ---

test('shell html contains root layout content', async () => {
  const html = await fetch(serverUrl + '/').then((r) => r.text())
  expect(html).toContain('id="root-nav"')
  expect(html).toContain('Root Nav')
})

test('shell html contains head tags', async () => {
  const html = await fetch(serverUrl + '/').then((r) => r.text())
  expect(html).toContain('SPA Shell Test</title>')
  expect(html).toContain('<meta')
})

test('shell html does not contain page content', async () => {
  const html = await fetch(serverUrl + '/').then((r) => r.text())
  expect(html).not.toContain('SPA Page Content')
})

test('shell html has placeholder', async () => {
  const html = await fetch(serverUrl + '/').then((r) => r.text())
  expect(html).toContain('data-one-spa-content')
})

test('shell renders different title per route via usePathname', async () => {
  const indexHtml = await fetch(serverUrl + '/').then((r) => r.text())
  const otherHtml = await fetch(serverUrl + '/other').then((r) => r.text())

  expect(indexHtml).toContain('SPA Shell Test</title>')
  expect(otherHtml).toContain('Other Page - SPA Shell</title>')
})

// --- hydration ---

test('page content renders after js', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')
  await page.waitForSelector('#spa-content', { timeout: 15000 })
  expect(await page.textContent('#spa-content')).toContain('SPA Page Content')
  await page.close()
})

test('root nav is visible immediately', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')
  expect(await page.textContent('#root-nav')).toBe('Root Nav')
  await page.close()
})

test('placeholder is gone after hydration', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')
  await page.waitForSelector('#spa-content', { timeout: 15000 })

  const placeholder = await page.$('[data-one-spa-content]')
  expect(placeholder).toBeNull()
  await page.close()
})

test('useId is stable across hydration', async () => {
  const html = await fetch(serverUrl + '/').then((r) => r.text())
  const serverIdMatch = html.match(/data-rid="([^"]+)"/)
  expect(serverIdMatch).toBeTruthy()
  const serverId = serverIdMatch![1]

  const page = await context.newPage()
  await page.goto(serverUrl + '/')
  await page.waitForSelector('#spa-content', { timeout: 15000 })

  const clientId = await page.getAttribute('#hydration-id', 'data-rid')
  expect(clientId).toBe(serverId)

  const textContent = await page.textContent('#hydration-id')
  expect(textContent).toBe(serverId)

  await page.close()
})

test('usePathname matches after hydration', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/other')
  await page.waitForSelector('#other-content', { timeout: 15000 })

  expect(await page.textContent('#current-path')).toBe('/other')
  await page.close()
})

test('no hydration errors', async () => {
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', (msg) => {
    const text = msg.text()
    if (
      msg.type() === 'error' &&
      (text.includes('Hydration') ||
        text.includes('hydration') ||
        text.includes('did not match') ||
        text.includes('content does not match') ||
        text.includes('server-rendered HTML'))
    ) {
      errors.push(text)
    }
  })
  await page.goto(serverUrl + '/')
  await page.waitForSelector('#spa-content', { timeout: 15000 })
  await page.waitForTimeout(1000)

  expect(errors).toEqual([])
  await page.close()
})

test('no console errors', async () => {
  const page = await context.newPage()
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  page.on('pageerror', (err) => {
    errors.push(err.message)
  })
  await page.goto(serverUrl + '/')
  await page.waitForSelector('#spa-content', { timeout: 15000 })
  await page.waitForTimeout(1000)

  // filter out non-critical recoverable errors that one wraps in console.groupCollapsed
  const criticalErrors = errors.filter((e) => !e.includes('Non-critical recoverable'))
  expect(criticalErrors).toEqual([])
  await page.close()
})

// --- client-side navigation ---

test('client-side navigate from index to other', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')
  await page.waitForSelector('#spa-content', { timeout: 15000 })

  await page.click('#link-to-other')
  await page.waitForSelector('#other-content', { timeout: 15000 })

  expect(await page.textContent('#other-content')).toContain('Other SPA Page')
  expect(await page.textContent('#current-path')).toBe('/other')
  // root nav should still be there
  expect(await page.textContent('#root-nav')).toBe('Root Nav')

  await page.close()
})

test('client-side navigate back from other to index', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/other')
  await page.waitForSelector('#other-content', { timeout: 15000 })

  await page.click('#link-to-home')
  await page.waitForSelector('#spa-content', { timeout: 15000 })

  expect(await page.textContent('#spa-content')).toContain('SPA Page Content')
  expect(await page.textContent('#current-path')).toBe('/')
  expect(await page.textContent('#root-nav')).toBe('Root Nav')

  await page.close()
})

test('client-side navigation preserves layout without remount', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')
  await page.waitForSelector('#spa-content', { timeout: 15000 })

  // grab the useId value before navigation
  const idBefore = await page.getAttribute('#hydration-id', 'data-rid')

  await page.click('#link-to-other')
  await page.waitForSelector('#other-content', { timeout: 15000 })

  // useId should be the same since layout wasn't remounted
  const idAfter = await page.getAttribute('#hydration-id', 'data-rid')
  expect(idAfter).toBe(idBefore)

  await page.close()
})
