import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * Redirect Flash Regression Guard
 *
 * Reproduces soot's redirect-flash bug: loading /project/default_anon-umh7vfq6
 * fresh would briefly redirect to / and back (soot commit ea96e360).
 *
 * Structure (intentionally has NO intermediate _layout.tsx files at project/
 * or project/[projectId]/, so `project/[projectId]/index` is hoisted into
 * the (app) navigator as a flat sibling of `index`, `factory`, `editor`):
 *
 *   app/_layout+ssg.tsx                         SSG shell
 *   app/(app)/_layout.tsx                       reads usePathname(), wraps
 *                                               <Slot /> in a Suspense
 *                                               boundary that suspends for
 *                                               20ms on first render
 *                                               (mimics Zero / provider init)
 *   app/(app)/index.tsx                         calls router.replace on mount
 *                                               when async gate flags resolve
 *                                               and window.location is /
 *                                               (mimics soot's HomePage)
 *   app/(app)/factory.tsx, editor.tsx           sibling leaves
 *   app/(app)/project/[projectId]/index.tsx     deep project leaf
 *   app/(app)/project/[projectId]/[sessionId].tsx
 *
 * Bug sequence (before the fix):
 *   1. load /project/foo
 *   2. navigator picks project/[projectId]/index correctly, mounts at t=1s
 *   3. Suspense fallback commits, then resolves, re-mounting the subtree
 *   4. on re-mount, the navigator's initialRouteName resolver can't match
 *      `project/[projectId]/index` against `/project/foo` (the plain string
 *      `endsWith` check never matches dynamic segments), so it falls back
 *      to the first child → `index` mounts at t=2s while URL is /project/foo
 *   5. React Navigation linking syncs state to URL → browser URL becomes /
 *   6. HomeRoute's useEffect sees window.location === '/' and fires
 *      router.replace('/project/target') — visible as the URL flash
 *
 * Fix: packages/one/src/views/Navigator.tsx `resolvedInitialRouteName` now
 * matches screen names against the URL with a proper segment-by-segment
 * matcher that handles `[param]` and `[...param]` dynamic segments. The
 * (app) navigator correctly resolves `project/[projectId]/index` on every
 * (re-)mount instead of defaulting to `index`.
 *
 * Run with: TEST_ONLY=dev bun run vitest
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
 * Install flash detection before the page has hydrated.
 * Uses addInitScript so detection runs *before* any user JS — this is critical
 * because the flash can happen during initial hydration and may be over in a
 * couple of frames. MutationObserver + microtask-level polling gives us the
 * best chance of catching it.
 */
async function installFlashDetector(page: Page) {
  await page.addInitScript(() => {
    ;(window as any).__events = []
    ;(window as any).__homeMarkerEverSeen = false
    ;(window as any).__projectMarkerEverSeen = false

    const check = (reason: string) => {
      const home = document.querySelector('#home-marker')
      const project = document.querySelector('#project-marker')
      const url = location.pathname
      const appContainer = document.querySelector('#app-container')
      const dataPathname = appContainer?.getAttribute('data-pathname') ?? null
      ;(window as any).__events.push({
        t: performance.now(),
        reason,
        url,
        dataPathname,
        hasHome: !!home,
        hasProject: !!project,
      })
      if (home) (window as any).__homeMarkerEverSeen = true
      if (project) (window as any).__projectMarkerEverSeen = true
    }

    // run detection once the body exists
    const start = () => {
      check('initial')
      const observer = new MutationObserver(() => {
        check('mutation')
        queueMicrotask(() => check('microtask-after-mutation'))
      })
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
      })
      // rAF loop to catch frames the observer missed
      let running = true
      const raf = () => {
        if (!running) return
        check('raf')
        requestAnimationFrame(raf)
      }
      requestAnimationFrame(raf)
      // setInterval as a backstop for very tight windows
      const intervalId = setInterval(() => check('interval'), 4)
      ;(window as any).__stopFlashDetector = () => {
        running = false
        observer.disconnect()
        clearInterval(intervalId)
      }
    }

    if (document.body) start()
    else document.addEventListener('DOMContentLoaded', start, { once: true })
  })
}

async function collectResults(page: Page) {
  return page.evaluate(() => {
    ;(window as any).__stopFlashDetector?.()
    return {
      homeMarkerEverSeen: (window as any).__homeMarkerEverSeen as boolean,
      projectMarkerEverSeen: (window as any).__projectMarkerEverSeen as boolean,
      homeRouteMounted: !!(window as any).__homeRouteMounted,
      projectRouteMounted: !!(window as any).__projectRouteMounted,
      redirectFired: (window as any).__redirectFired as
        | { at: number; fromUrl: string; toUrl: string }
        | undefined,
      homeRouteMountLog: ((window as any).__homeRouteMountLog ?? []) as Array<{
        at: number
        url: string
      }>,
      projectRouteMountLog: ((window as any).__projectRouteMountLog ?? []) as Array<{
        at: number
        url: string
        projectId: string
      }>,
      events: (window as any).__events as Array<{
        t: number
        reason: string
        url: string
        dataPathname: string | null
        hasHome: boolean
        hasProject: boolean
      }>,
    }
  })
}

async function waitForSelector(page: Page, selector: string, timeout = 15000) {
  return page.waitForSelector(selector, { timeout }).catch(() => null)
}

describe('initial load of deep /project/[projectId] route', () => {
  test('loading /project/foo fresh should NOT briefly render the home marker', async () => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // throttle CPU so hydration has time to commit intermediate renders.
    // the bug reproduces at 6x throttle; at 1x React sometimes wins the
    // race and the flash is invisible even though the structural bug exists.
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })

    await installFlashDetector(page)

    // fresh load of the deep route — this is the scenario soot hit
    await page.goto(serverUrl + '/project/foo', { waitUntil: 'domcontentloaded' })

    // give hydration + any intermediate navigator resets time to settle
    await new Promise((r) => setTimeout(r, 1500))

    const results = await collectResults(page)

    // THE PRIMARY ASSERTION: the home route should never mount while the
    // browser URL is a /project/* path. if it does, the parent navigator
    // briefly picked `index` as the matched child during hydration, which
    // is the exact failure mode that produced soot's redirect-flash bug.
    // use the mount log's `url` field so we catch the bug even when a
    // subsequent redirect changes the URL before we check.
    const homeMountsOnProjectUrl = results.homeRouteMountLog.filter((m) =>
      m.url.startsWith('/project/')
    )
    expect(
      homeMountsOnProjectUrl,
      `redirect-flash bug: HomeRoute mounted while URL was /project/*.\n` +
        `home mount log: ${JSON.stringify(results.homeRouteMountLog, null, 2)}\n` +
        `project mount log: ${JSON.stringify(results.projectRouteMountLog, null, 2)}\n` +
        `redirect fired: ${JSON.stringify(results.redirectFired)}`
    ).toHaveLength(0)

    // secondary assertion: the home route's router.replace should never
    // have fired during this load. in soot this was the observable symptom
    // (URL bouncing from /project/foo → / → /project/target).
    expect(
      results.redirectFired,
      `redirect-flash bug: home route fired router.replace during initial load of /project/foo.\n${JSON.stringify(
        results.redirectFired,
        null,
        2
      )}`
    ).toBeUndefined()

    // happy path: the project route should have mounted and stayed mounted
    expect(results.projectRouteMounted, 'project route should have mounted').toBe(
      true
    )

    expect(errors).toHaveLength(0)
    await page.close()
  })

  test('loading / fresh should render the home marker (sanity check)', async () => {
    const page = await context.newPage()
    // prevent the home route's redirect from firing so we can assert
    // home-marker is visible. in the real app this redirect is intentional.
    await page.addInitScript(() => {
      ;(window as any).__testSuppressHomeRedirect = true
    })
    await installFlashDetector(page)

    await page.goto(serverUrl + '/', { waitUntil: 'domcontentloaded' })
    const homeEl = await waitForSelector(page, '#home-marker')
    expect(homeEl).toBeTruthy()

    await new Promise((r) => setTimeout(r, 100))
    const results = await collectResults(page)
    expect(results.homeMarkerEverSeen).toBe(true)

    await page.close()
  })
})
