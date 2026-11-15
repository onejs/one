import { type Browser, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL!

const page = '/search-params/loader'

async function loaderCalls() {
  const res = await fetch(`${serverUrl}/search-params/loader-calls`)
  return ((await res.json()) as { calls: number }).calls
}

function loaderData(html: string) {
  const match = html.match(/data-testid="loader-data"[^>]*>([^<]*)</)
  return JSON.parse(match![1].replaceAll('&quot;', '"'))
}

describe('search params validate before a loader runs', { timeout: 60_000 }, () => {
  it('hands the loader values the component schemas produce', async () => {
    const res = await fetch(`${serverUrl}${page}?page=3&tags=a&tags=b&metric=revenue`)
    expect(res.status).toBe(200)
    expect(loaderData(await res.text()).searchParams).toEqual({
      metric: 'revenue',
      page: 3,
      tags: ['a', 'b'],
      sort: 'asc',
    })
  })

  it('does not run the loader for a query a schema rejects', async () => {
    const before = await loaderCalls()
    const res = await fetch(`${serverUrl}${page}?sort=sideways`)
    expect(res.status).toBe(400)
    expect(await res.text()).toContain('sort')
    expect(await loaderCalls()).toBe(before)
  })
})

describe('a client navigation validates the query of the page it opens', { timeout: 90_000 }, () => {
  let browser: Browser

  beforeAll(async () => {
    browser = await chromium.launch({ headless: !process.env.DEBUG })
  })

  afterAll(async () => {
    await browser.close()
  })

  it('loads per query for push, replace, back, forward and refetch', async () => {
    const tab = await (await browser.newContext()).newPage()
    const readData = () =>
      tab.evaluate(() => {
        const text = document.querySelector('[data-testid="loader-data"]')?.textContent
        return text ? JSON.parse(text) : null
      })
    const expectPage = (n: number) =>
      tab.waitForFunction(
        (n) => {
          const text = document.querySelector('[data-testid="loader-data"]')?.textContent
          return !!text && JSON.parse(text).searchParams?.page === n
        },
        n,
        { timeout: 10_000 }
      )

    // the router commits the url after the data renders, so wait for it
    const expectUrlPage = (n: number) =>
      tab.waitForURL((url) => url.searchParams.get('page') === String(n), {
        timeout: 10_000,
      })

    await tab.goto(`${serverUrl}${page}?page=2&metric=revenue`)
    await tab.waitForSelector('[data-testid="table-next"]')
    expect((await readData()).searchParams.page).toBe(2)
    const afterDocument = await loaderCalls()

    // the document html is interactive only once the page has hydrated, so clicks before
    // that are lost
    await tab.waitForFunction(
      () => document.querySelector('[data-testid="loader-hydrated"]')?.textContent === 'yes',
      undefined,
      { timeout: 10_000 }
    )

    // hydration reused the document's data
    await tab.waitForLoadState('networkidle')
    expect(await loaderCalls()).toBe(afterDocument)

    await tab.click('[data-testid="table-next"]')
    await expectPage(3)
    await expectUrlPage(3)
    expect(await loaderCalls()).toBe(afterDocument + 1)

    await tab.click('[data-testid="table-next-replace"]')
    await expectPage(4)
    expect((await readData()).searchParams.metric).toBe('revenue')

    await tab.goBack()
    await expectPage(2)
    await tab.goForward()
    await expectPage(4)

    const beforeRefetch = (await readData()).calls
    await tab.click('[data-testid="loader-refetch"]')
    await tab.waitForFunction(
      (calls) => {
        const text = document.querySelector('[data-testid="loader-data"]')?.textContent
        return !!text && JSON.parse(text).calls > calls
      },
      beforeRefetch,
      { timeout: 10_000 }
    )
    expect((await readData()).searchParams.page).toBe(4)

    // a refetch of a query a schema rejects does not run the loader or replace the data
    const beforeInvalid = await loaderCalls()
    const dataBeforeInvalid = await readData()
    await tab.click('[data-testid="loader-refetch-invalid"]')
    await tab.waitForFunction(
      () => !!document.querySelector('[data-testid="loader-refetch-error"]')?.textContent,
      undefined,
      { timeout: 10_000 }
    )
    expect(await loaderCalls()).toBe(beforeInvalid)
    expect(await readData()).toEqual(dataBeforeInvalid)

    // a client navigation to it loads the url as a document, which shows the server's 400
    const rejected = tab.waitForResponse(
      (res) =>
        res.request().resourceType() === 'document' &&
        res.url().includes('sort=sideways') &&
        res.status() === 400
    )
    await tab.click('[data-testid="loader-invalid"]')
    await rejected
    await tab.waitForURL('**sort=sideways')
    expect(await tab.textContent('body')).toContain('sort')
    expect(await loaderCalls()).toBe(beforeInvalid)
    await tab.close()
  })
})
