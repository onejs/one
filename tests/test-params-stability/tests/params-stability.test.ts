import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * useParams Stability Regression Guard
 *
 * Reproduces the soot bug where useParams() returns { id: '<the-id>' } on
 * the first render of a dynamic route but then returns {} (empty) on a
 * subsequent re-render, while the URL stays at /preview/<id>.
 *
 * Structure (mirrors soot as closely as possible):
 *
 *   app/_layout+ssg.tsx                 SSG shell (spa-shell mode)
 *   app/(site)/_layout.tsx              pass-through <Slot />
 *   app/(site)/index+ssg.tsx            home, makes `/` reachable
 *   app/(site)/preview/[id]/index.tsx   calls useParams(), logs on every render
 *
 * The page pushes every render's params object into window.__previewRenders.
 * The test loads /preview/<id> fresh, waits for hydration to settle, and
 * asserts that every render observed { id: '<the-id>' }. If any render saw
 * {} or an id that didn't match the URL, the test fails with the render log.
 *
 * Root cause (as of 2026-04-18):
 *   - In spa-shell mode, routes render with an `<div data-one-spa-content />`
 *     placeholder on first client paint, then flip to the real component
 *     after a useLayoutEffect sets isSpaShell=false.
 *   - Under React StrictMode (the default in dev), the navigator subtree
 *     effectively remounts between the placeholder render and the real
 *     render. On the remount, React Navigation's useNavigationBuilder can
 *     fall through to StackRouter.getInitialState() instead of
 *     getRehydratedState(), because the parent-provided initialState has
 *     already been consumed.
 *   - StackRouter.getInitialState produces a default route for the first
 *     child screen with `params: routeParamList[initialRouteName]` — which
 *     is undefined for dynamic routes (no defaults registered). The route
 *     object therefore has a freshly-nanoid'd key and no params.
 *   - That route is passed to <Route route={...}> which sets
 *     RouteParamsContext to undefined, and useParams() returns {}.
 *   - A follow-up resetRoot(freshState) in Root.tsx then restores params
 *     to their URL-derived values, so the empty-params render is transient
 *     but very observable from user components.
 *
 * Disabling StrictMode (ONE_DISABLE_STRICT_MODE=1) makes the bug disappear.
 */

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG

if (!serverUrl) {
  throw new Error('ONE_SERVER_URL is required')
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

async function collectRenders(page: Page) {
  return page.evaluate(() => {
    return (
      ((window as any).__previewRenders as Array<{
        at: number
        url: string
        params: Record<string, unknown>
      }>) ?? []
    ).map((r) => ({ ...r, params: { ...r.params } }))
  })
}

describe('useParams stability on dynamic route hydration', { retry: 1 }, () => {
  test('loading /preview/<id> fresh — every render sees { id }, never {}', async () => {
    const id = 'c33226705841ff0d'
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // throttle cpu so hydration has time to commit intermediate renders —
    // the bug reproduces more reliably when the spa-shell flip and react's
    // strict-mode remount straddle a tick where params drop.
    const cdp = await context.newCDPSession(page)
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 })

    await page.goto(`${serverUrl}/preview/${id}`, { waitUntil: 'domcontentloaded' })

    // wait for the preview page to render at least once
    await page.waitForSelector('#preview-page', { timeout: 15000 })

    // give hydration a beat to complete any follow-up renders (resetRoot etc.)
    await new Promise((r) => setTimeout(r, 500))

    const renders = await collectRenders(page)

    // there should be at least one render
    expect(
      renders.length,
      `preview page never rendered. got ${renders.length} renders.`
    ).toBeGreaterThan(0)

    // every render's params must have the id from the URL
    const bad = renders.filter((r) => r.params.id !== id)
    expect(
      bad,
      `useParams returned unexpected params on ${bad.length} of ${renders.length} renders.\n` +
        `bad renders: ${JSON.stringify(bad, null, 2)}\n` +
        `full log: ${JSON.stringify(renders, null, 2)}`
    ).toHaveLength(0)

    // and the rendered DOM must show the id (not "(empty)")
    const renderedId = await page.textContent('#preview-id')
    expect(renderedId).toBe(id)

    expect(errors).toEqual([])
    await page.close()
  })
})
