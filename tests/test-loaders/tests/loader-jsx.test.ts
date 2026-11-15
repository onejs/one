import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG

async function waitForTextContent(
  page: Page,
  selector: string,
  text: string,
  timeout = 10000
) {
  await page.waitForFunction(
    ([sel, txt]) => document.querySelector(sel)?.textContent?.includes(txt),
    [selector, text] as const,
    { timeout }
  )
}

// ssr html shows the island before hydration wires its press handler, so click
// until the island actually responds (pre-hydration clicks are no-ops)
async function clickUntilText(
  page: Page,
  clickSelector: string,
  textSelector: string,
  text: string
) {
  for (let attempt = 0; attempt < 20; attempt++) {
    await page.click(clickSelector)
    const matched = await page
      .waitForFunction(
        ([sel, txt]) => document.querySelector(sel)?.textContent?.includes(txt),
        [textSelector, text] as const,
        { timeout: 500 }
      )
      .then(() => true)
      .catch(() => false)
    if (matched) return
  }
  throw new Error(`clicking ${clickSelector} never produced "${text}" in ${textSelector}`)
}

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

describe('loader JSX (renderJSX)', () => {
  test('ssr html contains the server-rendered tree and the json envelope', async () => {
    const res = await fetch(serverUrl + '/loader-jsx')
    const html = await res.text()

    expect(html).toContain('server heading')
    expect(html).toContain('post-one')
    expect(html).toContain('post-two')
    expect(html).toMatch(/server-signal-(?:<!-- -->)?\d+/)
    expect(html).not.toContain('loader-jsx-server-only-marker')
    expect(html).toContain('__oneJSX')
    // server components resolved in order even though post-two finishes first
    expect(html.indexOf('post-one')).toBeLessThan(html.indexOf('post-two'))
  })

  test('hydrates client islands, shows the skew fallback, and keeps plain loader data', async () => {
    const page = await context.newPage()
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })
    page.on('pageerror', (err) => consoleErrors.push(String(err)))

    await page.goto(serverUrl + '/loader-jsx')

    await waitForTextContent(page, '#jsx-heading', 'server heading')
    await waitForTextContent(page, '#jsx-plain', 'plain-data')
    await waitForTextContent(page, '#jsx-count-a', 'a:10')

    // the island is interactive after hydration
    await clickUntilText(page, '#jsx-counter-a', '#jsx-count-a', 'a:11')
    await page.click('#jsx-counter-a')
    await waitForTextContent(page, '#jsx-count-a', 'a:12')

    // an island this client does not know renders its ClientFallback
    await waitForTextContent(page, '#ghost-fallback', 'update the app')

    const hydrationErrors = consoleErrors.filter((e) => /hydrat|418|423|425/i.test(e))
    expect(hydrationErrors).toEqual([])

    await page.close()
  })

  test('counter state follows its key when a refetch reorders the list', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-jsx')

    await waitForTextContent(page, '#jsx-count-a', 'a:10')
    await clickUntilText(page, '#jsx-counter-a', '#jsx-count-a', 'a:11')

    await page.click('#flip-order')
    await page.waitForURL(`${serverUrl}/loader-jsx?flip=1`, { timeout: 5000 })

    // order flipped in the dom
    await page.waitForFunction(
      () => {
        const a = document.querySelector('#jsx-counter-a')
        const b = document.querySelector('#jsx-counter-b')
        if (!a || !b) return false
        return Boolean(b.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING)
      },
      { timeout: 10000 }
    )

    // state stayed with counter a, and counter b kept its own start value
    expect(await page.textContent('#jsx-count-a')).toContain('a:11')
    expect(await page.textContent('#jsx-count-b')).toContain('b:20')

    await page.close()
  })

  test('client-side navigation fetches and revives loader jsx', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader')

    await waitForTextContent(page, '#loader-data', 'loader-success')
    await page.click('#go-loader-jsx')
    await page.waitForURL(`${serverUrl}/loader-jsx`, { timeout: 5000 })

    await waitForTextContent(page, '#jsx-heading', 'server heading')
    await clickUntilText(page, '#jsx-counter-b', '#jsx-count-b', 'b:21')

    await page.close()
  })

  test('production client bundle contains no server walker or server-only loader code', async () => {
    if (process.env.TEST_ONLY !== 'prod') return

    const clientDir = join(process.cwd(), 'dist/client')
    const files: string[] = []
    const collect = async (dir: string) => {
      for (const entry of await readdir(dir, { withFileTypes: true })) {
        const path = join(dir, entry.name)
        if (entry.isDirectory()) await collect(path)
        else if (/\.(?:js|mjs|cjs)$/.test(entry.name)) files.push(path)
      }
    }
    await collect(clientDir)
    const bundle = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join(
      '\n'
    )

    // prove the searched output is the loader-jsx client build, then that its
    // server tree stayed server-side: no walker, no node-only data module.
    expect(bundle).toContain('components/LoaderJsxCounter.tsx#Counter')
    expect(bundle).not.toContain('cannot cross to the client')
    expect(bundle).not.toContain('loader-jsx-server-only-marker')
    expect(bundle).not.toContain('node:os')
  })

  test('ssg page ships static loader jsx and hydrates its island', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-jsx/static')

    await waitForTextContent(page, '#jsx-static-heading', 'static heading')
    await waitForTextContent(page, '#jsx-count-static', 'static:5')
    await clickUntilText(page, '#jsx-counter-static', '#jsx-count-static', 'static:6')

    await page.close()
  })
})
