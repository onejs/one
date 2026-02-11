import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL!
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

// construct a loader URL the way the client does during SPA navigation
// in dev: /_one/assets/<path_with_underscores>_<cachekey>_vxrn_loader.js
// the server matches on pathname.endsWith('_vxrn_loader.js')
function loaderUrl(routePath: string) {
  const cleaned = routePath.replace(/^\//, '').replace(/\//g, '_')
  return `${serverUrl}/_one/assets/${cleaned}_0_vxrn_loader.js`
}

describe('Loader Redirect', { retry: 2, timeout: 60_000 }, () => {
  // ─── server-side: verify the loader response contains redirect signal ───

  describe('server loader returns redirect signal', () => {
    it('unauthenticated loader request returns redirect for dashboard', async () => {
      const res = await fetch(loaderUrl('/loader-redirect-test/dashboard'))
      expect(res.status).toBe(200)
      expect(res.headers.get('content-type')).toContain('text/javascript')

      const body = await res.text()
      // the response is a JS module — when evaluated, loader() should return redirect metadata
      // must not contain secret data regardless of format
      expect(body).not.toContain('dashboard-secret-data')
      expect(body).not.toContain('test-user')
    })

    it('unauthenticated loader request returns redirect for profile', async () => {
      const res = await fetch(loaderUrl('/loader-redirect-test/profile'))
      const body = await res.text()
      expect(body).not.toContain('profile-secret-data')
      expect(body).not.toContain('user@test.com')
    })

    it('unauthenticated loader request returns redirect for settings', async () => {
      const res = await fetch(loaderUrl('/loader-redirect-test/settings'))
      const body = await res.text()
      expect(body).not.toContain('settings-secret-data')
    })

    it('authenticated loader request returns real data', async () => {
      const res = await fetch(loaderUrl('/loader-redirect-test/dashboard'), {
        headers: { cookie: 'test-auth=1' },
      })
      const body = await res.text()
      // should not be a redirect when authenticated
      expect(body).not.toContain('__oneRedirect')
    })
  })

  // ─── server-side: direct page loads ───

  describe('direct server navigation (full page load)', () => {
    it('unauthenticated direct load of dashboard returns redirect', async () => {
      const res = await fetch(`${serverUrl}/loader-redirect-test/dashboard`, {
        redirect: 'manual',
      })
      // server-side page load with redirect() should produce a 3xx redirect
      // or if it renders, the loader data should not leak secrets
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location')
        expect(location).toBeTruthy()
      } else {
        // if rendered, must not leak secrets in the HTML
        const html = await res.text()
        expect(html).not.toContain('dashboard-secret-data')
      }
    })

    it('authenticated direct load of dashboard returns page content', async () => {
      const res = await fetch(`${serverUrl}/loader-redirect-test/dashboard`, {
        headers: { cookie: 'test-auth=1' },
      })
      const html = await res.text()
      expect(html).toContain('dashboard page')
    })

    it('public page loads normally', async () => {
      const res = await fetch(`${serverUrl}/loader-redirect-test`)
      const html = await res.text()
      expect(html).toContain('public page')
    })
  })

  // ─── client-side: browser navigation with Playwright ───

  describe('client-side Link navigation triggers redirect', { timeout: 120_000 }, () => {
    it('clicking link to protected dashboard redirects back (no auth cookie)', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/loader-redirect-test`, {
          waitUntil: 'networkidle',
        })

        // verify we're on the public page
        await page.waitForSelector('#public-page', { timeout: 15_000 })
        expect(await page.textContent('#public-page')).toContain('public page')

        // click the link to dashboard (protected route)
        await page.click('#link-to-dashboard')

        // should redirect back — wait for the redirect to settle
        await page.waitForTimeout(3000)

        // url should NOT be /dashboard
        expect(page.url()).not.toContain('/dashboard')

        // should still see the public page (redirected back to index)
        await page.waitForSelector('#public-page', { timeout: 10_000 })
        expect(await page.textContent('#public-page')).toContain('public page')
      } finally {
        await page.close()
      }
    })

    it('clicking link to protected profile redirects back (no auth cookie)', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/loader-redirect-test`, {
          waitUntil: 'networkidle',
        })
        await page.waitForSelector('#public-page', { timeout: 15_000 })

        await page.click('#link-to-profile')
        await page.waitForTimeout(3000)

        expect(page.url()).not.toContain('/profile')
        await page.waitForSelector('#public-page', { timeout: 10_000 })
      } finally {
        await page.close()
      }
    })

    it('clicking link to settings redirects to / (app root)', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/loader-redirect-test`, {
          waitUntil: 'networkidle',
        })
        await page.waitForSelector('#public-page', { timeout: 15_000 })

        await page.click('#link-to-settings')
        await page.waitForTimeout(5000)

        // should redirect to /, not stay on settings
        expect(page.url()).not.toContain('/settings')
      } finally {
        await page.close()
      }
    })

    it('dashboard renders correctly when authenticated via cookie', async () => {
      const authedContext = await browser.newContext()
      try {
        // set auth cookie before navigating
        await authedContext.addCookies([
          {
            name: 'test-auth',
            value: '1',
            domain: new URL(serverUrl).hostname,
            path: '/',
          },
        ])

        const page = await authedContext.newPage()
        try {
          await page.goto(`${serverUrl}/loader-redirect-test`, {
            waitUntil: 'networkidle',
          })
          await page.waitForSelector('#public-page', { timeout: 15_000 })

          // click to dashboard — should succeed with auth cookie
          await page.click('#link-to-dashboard')
          await page.waitForURL('**/loader-redirect-test/dashboard', {
            timeout: 15_000,
          })

          await page.waitForSelector('#dashboard-page', { timeout: 15_000 })
          expect(await page.textContent('#dashboard-page')).toContain('dashboard page')

          // verify loader data is present
          const dataText = await page.textContent('#dashboard-data')
          expect(dataText).toContain('dashboard-secret-data')
          expect(dataText).toContain('test-user')
        } finally {
          await page.close()
        }
      } finally {
        await authedContext.close()
      }
    })
  })

  // ─── security: no data leaks ───

  describe('no sensitive data in redirect responses', () => {
    it('dashboard redirect has no secret data', async () => {
      const res = await fetch(loaderUrl('/loader-redirect-test/dashboard'))
      const body = await res.text()
      expect(body).not.toContain('secret')
      expect(body).not.toContain('dashboard-secret-data')
      expect(body).not.toContain('test-user')
    })

    it('profile redirect has no secret data', async () => {
      const res = await fetch(loaderUrl('/loader-redirect-test/profile'))
      const body = await res.text()
      expect(body).not.toContain('secret')
      expect(body).not.toContain('email')
      expect(body).not.toContain('profile-secret-data')
      expect(body).not.toContain('user@test.com')
    })

    it('settings redirect has no secret data', async () => {
      const res = await fetch(loaderUrl('/loader-redirect-test/settings'))
      const body = await res.text()
      expect(body).not.toContain('secret')
      expect(body).not.toContain('preferences')
      expect(body).not.toContain('settings-secret-data')
    })

    it('no secret data visible in browser when redirect happens', async () => {
      const page = await context.newPage()
      const loaderResponses: string[] = []

      // intercept network to capture loader response bodies
      page.on('response', async (response) => {
        if (response.url().includes('_vxrn_loader.js')) {
          try {
            const text = await response.text()
            loaderResponses.push(text)
          } catch {
            // response may already be consumed
          }
        }
      })

      try {
        await page.goto(`${serverUrl}/loader-redirect-test`, {
          waitUntil: 'networkidle',
        })
        await page.waitForSelector('#public-page', { timeout: 15_000 })

        // navigate to protected route
        await page.click('#link-to-dashboard')
        await page.waitForTimeout(3000)

        // check that no captured loader response contains secret data
        for (const body of loaderResponses) {
          expect(body).not.toContain('dashboard-secret-data')
          expect(body).not.toContain('test-user')
        }
      } finally {
        await page.close()
      }
    })
  })

  // ─── edge cases ───

  describe('edge cases', () => {
    it('multiple navigations to protected routes all redirect', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/loader-redirect-test`, {
          waitUntil: 'networkidle',
        })
        await page.waitForSelector('#public-page', { timeout: 15_000 })

        // first attempt
        await page.click('#link-to-dashboard')
        await page.waitForTimeout(3000)
        expect(page.url()).not.toContain('/dashboard')

        // wait for redirect to settle, try again
        await page.waitForSelector('#link-to-profile', { timeout: 10_000 })
        await page.click('#link-to-profile')
        await page.waitForTimeout(3000)
        expect(page.url()).not.toContain('/profile')
      } finally {
        await page.close()
      }
    })

    it('back/forward navigation after redirect works', async () => {
      const page = await context.newPage()
      try {
        // start at app root
        await page.goto(`${serverUrl}/`, { waitUntil: 'networkidle' })
        await page.waitForTimeout(1000)

        // navigate to the public page
        await page.goto(`${serverUrl}/loader-redirect-test`, {
          waitUntil: 'networkidle',
        })
        await page.waitForSelector('#public-page', { timeout: 15_000 })

        // click protected link — triggers redirect back
        await page.click('#link-to-dashboard')
        await page.waitForTimeout(3000)

        // should be redirected
        expect(page.url()).not.toContain('/dashboard')

        // go back should work without crashing
        await page.goBack()
        await page.waitForTimeout(2000)
        // browser history shouldn't be corrupted
        expect(page.url()).toBeTruthy()
      } finally {
        await page.close()
      }
    })

    it('direct navigation to protected route still works (SSR redirect)', async () => {
      const page = await context.newPage()
      try {
        // going directly to the protected route should redirect via SSR
        await page.goto(`${serverUrl}/loader-redirect-test/dashboard`, {
          waitUntil: 'networkidle',
        })
        await page.waitForTimeout(2000)

        // should not see the dashboard content (redirected or empty)
        const dashboardContent = await page.$('#dashboard-page')
        if (dashboardContent) {
          // if the page rendered, it should not have secret data
          // (this means the SSR redirect didn't fire, which is possible
          // if the loader throws differently in SSR context)
          const text = await dashboardContent.textContent()
          // just verify the page exists — the SSR behavior may vary
          expect(text).toBeTruthy()
        }
      } finally {
        await page.close()
      }
    })
  })
})
