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

test('index page', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')

  expect(await page.textContent('#content')).toEqual(
    'Hello, this is the basic app test case!'
  )

  await page.close()
})

test('api', async () => {
  const res = await fetchThing('/api', 'json')
  expect(res).toMatchInlineSnapshot(`
    {
      "api": "works under app-cases/basic/app",
    }
  `)
})

test('middleware', async () => {
  const res = await fetchThing('/?test-middleware', 'json')
  expect(res).toMatchInlineSnapshot(`
    {
      "middleware": "works under app-cases/basic/app",
    }
  `)
})

async function fetchThing(path = '/', type: 'text' | 'json' | 'headers') {
  return await fetch(`${process.env.ONE_SERVER_URL}${path}`).then((res) => {
    if (type === 'headers') {
      return res.headers
    }
    return res[type]()
  })
}
