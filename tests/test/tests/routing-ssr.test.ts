import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

describe(`SSR Routing Tests`, () => {
  // it('should render the SSR page', async () => {
  //   const response = await fetch(`${serverUrl}/ssr/basic`)
  //   const html = await response.text()
  //   expect(html).toContain('This is a basic SSR page')
  // })

  // it('should return 200 status for the SSR page', async () => {
  //   const response = await fetch(`${serverUrl}/ssr/basic`)
  //   expect(response.status).toBe(200)
  // })

  it(`Dynamic SSR pages should navigate between and use loaders properly`, async () => {
    const page = await context.newPage()

    await page.goto(`${serverUrl}/ssr/sub/page`)

    expect(await page.textContent('#params')).toContain(`{"rest":["sub","page"]}`)
    expect(await page.textContent('#data')).toContain(`"sub/page"`)

    await page.click(`#test-change-sub-route`)

    expect(page.url()).toBe(`${serverUrl}/ssr/sub/page-next`)
    expect(await page.textContent('#params')).toContain(`{"rest":["sub","page-next"]}`)
    expect(await page.textContent('#data')).toContain(`"sub/page-next"`)

    await page.click(`#test-change-sub-route`)

    expect(page.url()).toBe(`${serverUrl}/ssr/sub/page-next-next`)
    expect(await page.textContent('#params')).toContain(`{"rest":["sub","page-next-next"]}`)
    expect(await page.textContent('#data')).toContain(`"sub/page-next-next"`)

    await page.close()
  })
})
