import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * Auth-gate redirect bug — takeout reproduction.
 *
 * Setup mirrors takeout's app/(app)/_layout.tsx:
 *   app/(gate)/_layout.tsx        — auth gate. logged-in + /gate-auth → Redirect /gate-home/feed
 *   app/(gate)/gate-auth/login    — login page with a button that flips auth state
 *   app/(gate)/gate-home/feed     — feed page after login
 *
 * Bug sequence:
 *   1. user opens /gate-auth/login (auth=logged-out)
 *   2. clicks "Login" → auth state becomes logged-in
 *   3. (gate)/_layout returns <Redirect href="/gate-home/feed" /> instead of <Slot />
 *   4. router.replace fires, URL becomes /gate-home/feed
 *   5. (gate)/_layout re-renders, returns <Slot /> again
 *   6. EXPECTED: #gate-feed-page renders
 *   7. ACTUAL (bug): URL is /gate-home/feed but #gate-login-page is still in the DOM
 */

const serverUrl = process.env.ONE_SERVER_URL

if (!serverUrl) {
  throw new Error('ONE_SERVER_URL is required')
}

const isDebug = !!process.env.DEBUG

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser?.close()
})

async function setAuth(page: Page, next: 'loading' | 'logged-in' | 'logged-out') {
  await page.evaluate((value) => {
    ;(window as any).__setAuth?.(value)
  }, next)
}

describe('Auth-gate Redirect from /gate-auth/login → /gate-home/feed', () => {
  test('clicking Login transitions URL AND rendered content to /gate-home/feed', async () => {
    const page = await context.newPage()
    const navigations: string[] = []
    const errors: string[] = []

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        navigations.push(frame.url())
      }
    })
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(serverUrl + '/gate-auth/login')

    // wait for the auth provider to register __setAuth
    await page.waitForFunction(() => typeof (window as any).__setAuth === 'function', {
      timeout: 10000,
    })

    // resolve auth to logged-out → gate layout renders Slot, login page mounts
    await setAuth(page, 'logged-out')
    await page.waitForSelector('#gate-login-page', { timeout: 10000 })

    expect(await page.textContent('#gate-login-pathname')).toBe('/gate-auth/login')
    expect(new URL(page.url()).pathname).toBe('/gate-auth/login')

    // user clicks login → auth flips to logged-in → gate layout returns
    // <Redirect href="/gate-home/feed" /> → router.replace runs → URL changes
    await page.click('#gate-login-btn')

    // wait for URL to settle on /gate-home/feed
    await page.waitForFunction(
      () => new URL(window.location.href).pathname === '/gate-home/feed',
      { timeout: 10000 }
    )

    // small delay to allow any re-resolution to settle
    await page.waitForTimeout(500)

    const finalUrl = new URL(page.url()).pathname
    const hasFeedPage = await page.$('#gate-feed-page')
    const hasLoginPage = await page.$('#gate-login-page')
    const layoutMounts: string[] = await page.evaluate(
      () => (window as any).__oneSpaShellLayoutMounts ?? []
    )

    const debug =
      `\nfinalUrl: ${finalUrl}` +
      `\nhasFeedPage: ${hasFeedPage !== null}` +
      `\nhasLoginPage: ${hasLoginPage !== null}` +
      `\nnavigations: ${JSON.stringify(navigations, null, 2)}` +
      `\nlayoutMounts: ${JSON.stringify(layoutMounts, null, 2)}` +
      `\nerrors: ${JSON.stringify(errors, null, 2)}`

    expect(finalUrl, `URL did not transition to /gate-home/feed.${debug}`).toBe(
      '/gate-home/feed'
    )

    expect(
      hasLoginPage,
      `login page is still rendered at /gate-home/feed — Redirect updated URL but Slot never re-resolved.${debug}`
    ).toBeNull()

    expect(
      hasFeedPage,
      `feed page never rendered after auth-gate Redirect.${debug}`
    ).not.toBeNull()

    if (hasFeedPage) {
      expect(await page.textContent('#gate-feed-pathname')).toBe('/gate-home/feed')
    }

    expect(errors).toEqual([])

    await page.close()
  })
})
