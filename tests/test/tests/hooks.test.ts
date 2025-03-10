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

test('hooks', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/hooks')

  // Run these multiple times to ensure that the hooks are working correctly,
  // as bugs may emerge while doing so.
  for (let i = 0; i < 3; i++) {
    const link0 = await page.$('a[href="/hooks"]')
    await link0?.click({
      force: true,
    })
    await page.waitForURL('**/hooks', { timeout: 5_000 })

    const link1 = await page.$('a[href="/hooks/contents/page-1"]')
    await link1?.click({
      force: true,
    })
    await page.waitForURL('**/hooks/contents/page-1', { timeout: 5_000 })

    expect(await page.textContent('#layout-usePathname')).toEqual(
      'Layout `usePathname()`: /hooks/contents/page-1'
    )
    expect(await page.textContent('#page-usePathname')).toContain(
      'Page `usePathname()`: /hooks/contents/page-1'
    )

    const link2 = await page.$('a[href="/hooks/contents/page-2"]')
    await link2?.click({
      force: true,
    })
    await page.waitForURL('**/hooks/contents/page-2', { timeout: 5_000 })

    expect(await page.textContent('#layout-usePathname')).toEqual(
      'Layout `usePathname()`: /hooks/contents/page-2'
    )
    expect(await page.textContent('#page-usePathname')).toContain(
      'Page `usePathname()`: /hooks/contents/page-2'
    )
  }

  await page.close()
})

test('useParams in _layout', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/hooks')

  const link1 = await page.$('a[href="/hooks/contents/with-slug/slug-page-foo"]')
  await link1?.click({
    force: true,
  })
  await page.waitForURL('**/hooks/contents/with-slug/slug-page-foo', { timeout: 5_000 })
  const pageUseParamsJsonString1 = (await page.getByTestId('page-useParams').textContent()) || '{}'
  const pageUseParamsJson1 = JSON.parse(pageUseParamsJsonString1)
  expect(pageUseParamsJson1.slug).toBe('slug-page-foo')
  const layoutUseParamsJsonString1 =
    (await page.getByTestId('layout-useParams').textContent()) || '{}'
  const layoutUseParamsJson1 = JSON.parse(layoutUseParamsJsonString1)
  expect(layoutUseParamsJson1.slug).toBe('slug-page-foo')

  const link2 = await page.$('a[href="/hooks/contents/with-slug/slug-page-bar"]')
  await link2?.click({
    force: true,
  })
  await page.waitForURL('**/hooks/contents/with-slug/slug-page-bar', { timeout: 5_000 })
  const pageUseParamsJsonString2 = (await page.getByTestId('page-useParams').textContent()) || '{}'
  const pageUseParamsJson2 = JSON.parse(pageUseParamsJsonString2)
  expect(pageUseParamsJson2.slug).toBe('slug-page-bar')
  const layoutUseParamsJsonString2 =
    (await page.getByTestId('layout-useParams').textContent()) || '{}'
  const layoutUseParamsJson2 = JSON.parse(layoutUseParamsJsonString2)
  expect(layoutUseParamsJson2.slug).toBe('slug-page-bar')
})
