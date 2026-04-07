import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * Deploy URL Flash Regression Guard
 *
 * Reproduces soot's bug: loading / briefly flashes /deploy in the address
 * bar before the home route's redirect fires and navigates to
 * /project/{activeProject}/main.
 *
 * Structure mirrors soot:
 *   - root layout is +ssg (spa-shell mode)
 *   - three route groups: (app), (auth), (site)
 *   - (app) has many sibling leaves: index, deploy, factory, editor, prod, ...
 *   - (app) has nested project routes with passthrough layouts at each level
 *   - (app)/_layout reads usePathname() and has a Suspense boundary
 *
 * Bug scenario:
 *   1. load /
 *   2. spa-shell hydrates, root navigator resolves (app) group
 *   3. (app) navigator initializes — should pick `index` but briefly
 *      focuses a wrong sibling (deploy) during re-initialization
 *   4. useLinking's onStateChange syncs the wrong state to the URL
 *   5. URL flashes to /deploy
 *   6. navigator corrects itself → URL goes back to /
 *   7. home route's useEffect fires router.replace → /project/target/main
 *
 * The test catches the /deploy flash at step 5.
 */

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

/**
 * Install URL flash detection before the page has hydrated.
 * Monkey-patches history.pushState and history.replaceState to record
 * every URL change. Also polls via rAF as a backstop.
 */
async function installUrlTracker(page: Page) {
  await page.addInitScript(() => {
    ;(window as any).__urlChanges = []
    const record = (source: string) => {
      ;(window as any).__urlChanges.push({
        url: location.pathname + location.search,
        time: performance.now(),
        source,
      })
    }

    const origPush = history.pushState.bind(history)
    const origReplace = history.replaceState.bind(history)

    history.pushState = function (...args: any[]) {
      origPush(...args)
      record('pushState')
    }
    history.replaceState = function (...args: any[]) {
      origReplace(...args)
      record('replaceState')
    }

    window.addEventListener('popstate', () => record('popstate'))

    let running = true
    let lastUrl = ''
    const poll = () => {
      if (!running) return
      const cur = location.pathname + location.search
      if (cur !== lastUrl) {
        record('poll')
        lastUrl = cur
      }
      requestAnimationFrame(poll)
    }
    requestAnimationFrame(poll)
    ;(window as any).__stopUrlTracker = () => {
      running = false
    }

    record('init')
  })
}

async function collectUrlResults(page: Page) {
  return page.evaluate(() => {
    ;(window as any).__stopUrlTracker?.()
    return {
      finalUrl: location.pathname + location.search,
      urlChanges: (window as any).__urlChanges as Array<{
        url: string
        time: number
        source: string
      }>,
      homeRouteMounted: !!(window as any).__homeRouteMounted,
      deployRouteMounted: !!(window as any).__deployRouteMounted,
      homeRouteMountLog: ((window as any).__homeRouteMountLog ?? []) as Array<{
        at: number
        url: string
      }>,
      deployRouteMountLog: ((window as any).__deployRouteMountLog ?? []) as Array<{
        at: number
        url: string
      }>,
      redirectFired: (window as any).__redirectFired as
        | { at: number; fromUrl: string; toUrl: string }
        | undefined,
    }
  })
}

describe('loading / should not flash /deploy URL', { retry: 1 }, () => {
  test('URL should never contain /deploy when loading /', async () => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // throttle CPU so hydration timing issues are more likely to surface
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })

    await installUrlTracker(page)

    await page.goto(serverUrl + '/', { waitUntil: 'domcontentloaded' })

    // wait for hydration + redirects to settle
    await new Promise((r) => setTimeout(r, 3000))

    const results = await collectUrlResults(page)

    // PRIMARY ASSERTION: /deploy should never appear in the URL history.
    // if the navigator briefly focuses the deploy sibling during spa-shell
    // hydration, useLinking will push /deploy to the browser URL.
    const deployUrlEntries = results.urlChanges.filter((e) => e.url.startsWith('/deploy'))
    expect(
      deployUrlEntries,
      `deploy URL flash detected — /deploy appeared in URL history.\n` +
        `URL changes: ${JSON.stringify(results.urlChanges, null, 2)}\n` +
        `deploy mount log: ${JSON.stringify(results.deployRouteMountLog, null, 2)}\n` +
        `home mount log: ${JSON.stringify(results.homeRouteMountLog, null, 2)}`
    ).toHaveLength(0)

    // the deploy ROUTE component should never mount when loading /
    expect(
      results.deployRouteMounted,
      `deploy route component mounted when loading /.\n` +
        `deploy mount log: ${JSON.stringify(results.deployRouteMountLog, null, 2)}`
    ).toBeFalsy()

    // verify no sibling routes briefly appeared in URL
    // (catch any wrong-sibling flash, not just deploy)
    const wrongUrls = results.urlChanges.filter((e) => {
      const url = e.url
      // only / and /project/* are valid URLs during this flow
      return (
        url !== '/' && !url.startsWith('/project/') && url !== '' // ignore empty
      )
    })
    expect(
      wrongUrls,
      `unexpected URLs appeared during / load:\n${JSON.stringify(wrongUrls, null, 2)}`
    ).toHaveLength(0)

    expect(errors).toHaveLength(0)
    await page.close()
  })

  test('home route redirect should work correctly', async () => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })

    await installUrlTracker(page)

    await page.goto(serverUrl + '/', { waitUntil: 'domcontentloaded' })

    // wait for the home route's redirect to fire
    await new Promise((r) => setTimeout(r, 3000))

    const results = await collectUrlResults(page)

    // after the home redirect, we should be on /project/target/main
    expect(results.finalUrl).toBe('/project/target/main')

    // home route should have mounted
    expect(results.homeRouteMounted).toBe(true)

    // redirect should have fired
    expect(results.redirectFired).toBeTruthy()

    expect(errors).toHaveLength(0)
    await page.close()
  })

  test('loading /deploy directly should work without flashing other routes', async () => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })

    await installUrlTracker(page)

    await page.goto(serverUrl + '/deploy', { waitUntil: 'domcontentloaded' })

    await new Promise((r) => setTimeout(r, 3000))

    const results = await collectUrlResults(page)

    // deploy route should mount when loading /deploy
    expect(results.deployRouteMounted).toBe(true)

    // URL should end up at /project/target/main/deploy (from the redirect)
    // or stay at /deploy (if gates don't pass)
    // but should never flash /factory, /editor, /prod, or /
    const wrongFlash = results.urlChanges.filter((e) => {
      const url = e.url
      return url !== '/deploy' && !url.startsWith('/project/')
    })
    expect(
      wrongFlash,
      `unexpected URLs during /deploy load:\n${JSON.stringify(wrongFlash, null, 2)}`
    ).toHaveLength(0)

    expect(errors).toHaveLength(0)
    await page.close()
  })
})
