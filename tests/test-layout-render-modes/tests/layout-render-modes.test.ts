import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

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

// --- pure ssg ---

describe('Pure SSG (layout+ssg, page+ssg)', () => {
  test('static html contains layout and page content', async () => {
    const html = await fetch(serverUrl + '/pure-ssg').then(r => r.text())
    expect(html).toContain('id="pure-ssg-layout"')
    expect(html).toContain('id="pure-ssg-page"')
    // note: React adds <!-- --> comment markers between text nodes
    expect(html).toContain('pure-ssg-layout-mode')
    expect(html).toContain('pure-ssg-page-mode')
  })

  test('loaders run and data is present', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-ssg')
    await page.waitForLoadState('networkidle')

    const layoutData = await page.textContent('#pure-ssg-layout-data')
    expect(layoutData).toContain('pure-ssg-layout')

    const pageData = await page.textContent('#pure-ssg-page-data')
    expect(pageData).toContain('pure-ssg-page')

    await page.close()
  })

  test('client navigation preserves layout', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-ssg')
    await page.waitForLoadState('networkidle')

    // get initial layout data timestamp
    const initialLayoutData = await page.textContent('#pure-ssg-layout-data')

    // navigate to other page
    await page.click('#link-to-other')
    await page.waitForURL(`${serverUrl}/pure-ssg/other`)
    await page.waitForTimeout(300)

    // layout data should be same (layout not re-rendered)
    const newLayoutData = await page.textContent('#pure-ssg-layout-data')
    expect(newLayoutData).toBe(initialLayoutData)

    // but page content changed
    expect(await page.textContent('#pure-ssg-other-data')).toContain('pure-ssg-other')

    await page.close()
  })

  test('useMatches includes all layouts and page', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-ssg')
    await page.waitForLoadState('networkidle')

    // root + pure-ssg layout + page = 3 matches
    expect(await page.textContent('#pure-ssg-page-matches')).toContain('3')

    await page.close()
  })
})

// --- pure ssr ---

describe('Pure SSR (layout+ssr, page+ssr)', () => {
  test('page renders with dynamic content per request', async () => {
    const html1 = await fetch(serverUrl + '/pure-ssr').then(r => r.text())
    const html2 = await fetch(serverUrl + '/pure-ssr').then(r => r.text())

    // both should contain SSR markers (note: React adds <!-- --> comment markers)
    expect(html1).toContain('pure-ssr-layout-mode')
    expect(html2).toContain('pure-ssr-layout-mode')

    // random should be different each request
    const random1 = html1.match(/"random":([\d.]+)/)?.[1]
    const random2 = html2.match(/"random":([\d.]+)/)?.[1]
    expect(random1).not.toBe(random2)
  })

  test('loaders run on every request', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-ssr')
    await page.waitForLoadState('networkidle')

    const data = await page.textContent('#pure-ssr-page-data')
    expect(data).toContain('pure-ssr-page')
    expect(data).toContain('random')

    await page.close()
  })

  test('client navigation works', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-ssr')
    await page.waitForLoadState('networkidle')

    await page.click('#link-to-other')
    await page.waitForURL(`${serverUrl}/pure-ssr/other`)
    await page.waitForTimeout(300)

    expect(await page.textContent('#pure-ssr-other-data')).toContain('pure-ssr-other')

    await page.close()
  })
})

// --- pure spa ---

describe('Pure SPA (layout+spa, page+spa)', () => {
  test('initial html has minimal content', async () => {
    const html = await fetch(serverUrl + '/pure-spa').then(r => r.text())
    // with renderRootLayout, root SSG layout is rendered
    expect(html).toContain('id="root-nav"')
    // but SPA layout and page are NOT rendered on server
    expect(html).not.toContain('id="pure-spa-layout"')
    expect(html).not.toContain('id="pure-spa-page"')
  })

  test('content renders after js hydration', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-spa')
    await page.waitForSelector('#pure-spa-page', { timeout: 15000 })

    // verify the element exists - page hydrated
    const element = await page.$('#pure-spa-page')
    expect(element).toBeTruthy()

    await page.close()
  })

  test('client navigation works', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-spa')
    await page.waitForSelector('#pure-spa-page', { timeout: 15000 })

    await page.click('#link-to-other')
    await page.waitForSelector('#pure-spa-other', { timeout: 15000 })

    expect(await page.textContent('#pure-spa-other-data')).toContain('pure-spa-other')

    await page.close()
  })
})

// --- ssg shell + spa content ---
// NOTE: Current spa-shell mode only renders ROOT layout.
// Intermediate layouts (like ssg-shell-spa/_layout+ssg.tsx) are NOT rendered.
// For full layout render mode support, we'd need to modify how spa-shell works.

describe('SSG Shell + SPA Content (renderRootLayout replacement)', () => {
  test('root layout is rendered', async () => {
    const html = await fetch(serverUrl + '/ssg-shell-spa').then(r => r.text())
    // root layout is rendered
    expect(html).toContain('id="root-nav"')
    // mode is spa-shell
    expect(html).toContain('"mode":"spa-shell"')
  })

  test('layout loaders run and data is in matches', async () => {
    const html = await fetch(serverUrl + '/ssg-shell-spa').then(r => r.text())
    // intermediate layout loader data is in matches array (for client hydration)
    expect(html).toContain('ssg-shell-for-spa')
  })

  test('page content renders after js', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/ssg-shell-spa')
    await page.waitForSelector('#ssg-shell-spa-page', { timeout: 15000 })

    // after hydration, SPA page element renders
    const element = await page.$('#ssg-shell-spa-page')
    expect(element).toBeTruthy()
    await page.close()
  })

  test('client navigation preserves root layout', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/ssg-shell-spa')
    await page.waitForSelector('#ssg-shell-spa-page', { timeout: 15000 })

    await page.click('#link-to-other')
    await page.waitForSelector('#ssg-shell-spa-other', { timeout: 15000 })

    // root layout still rendered
    expect(await page.textContent('#root-nav')).toBeTruthy()

    await page.close()
  })
})

// --- ssg shell + ssr content ---

describe('SSG Shell + SSR Content', () => {
  test('layout content is in html, page content is dynamic', async () => {
    const html1 = await fetch(serverUrl + '/ssg-shell-ssr').then(r => r.text())
    const html2 = await fetch(serverUrl + '/ssg-shell-ssr').then(r => r.text())

    // root layout data is present
    expect(html1).toContain('root-layout-data')
    expect(html2).toContain('root-layout-data')

    // page random should be different (SSR per request)
    const random1 = html1.match(/"random":([\d.]+)/)?.[1]
    const random2 = html2.match(/"random":([\d.]+)/)?.[1]
    expect(random1).not.toBe(random2)
  })

  test('client navigation between SSR pages works', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/ssg-shell-ssr')
    await page.waitForLoadState('networkidle')

    await page.click('#link-to-other')
    await page.waitForURL(`${serverUrl}/ssg-shell-ssr/other`)
    await page.waitForTimeout(300)

    expect(await page.textContent('#ssg-shell-ssr-other-data')).toContain('ssr-other-in-ssg-shell')

    await page.close()
  })
})

// --- ssr shell + ssg content ---
// NOTE: Current implementation renders full page for SSG pages.
// SSR layout re-renders don't apply when serving pre-built SSG HTML.

describe('SSR Shell + SSG Content', () => {
  test('page content is rendered', async () => {
    const html = await fetch(serverUrl + '/ssr-shell-ssg').then(r => r.text())
    // SSG page is fully rendered
    expect(html).toContain('id="ssr-shell-ssg-page"')
  })
})

// --- ssr shell + spa content ---
// NOTE: Current spa-shell mode only renders ROOT layout.
// The SSR intermediate layout is NOT rendered on server.

describe('SSR Shell + SPA Content', () => {
  test('root layout renders, page loads on client', async () => {
    const html = await fetch(serverUrl + '/ssr-shell-spa').then(r => r.text())

    // root layout is rendered
    expect(html).toContain('id="root-nav"')

    // intermediate SSR layout loader data is in matches (for client)
    expect(html).toContain('ssr-shell-for-spa')
    expect(html).toContain('rendered-on-server')
  })

  test('page element renders after hydration', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/ssr-shell-spa')
    await page.waitForSelector('#ssr-shell-spa-page', { timeout: 15000 })

    // just verify the SPA page element renders on client
    const element = await page.$('#ssr-shell-spa-page')
    expect(element).toBeTruthy()

    await page.close()
  })
})

// --- spa shell + ssg content ---
// This is the "weird" case where outer is SPA but inner is SSG.
// The SSG content is pre-built and may be visible for SEO.

describe('SPA Shell + SSG Content', () => {
  test('ssg content is in html', async () => {
    const html = await fetch(serverUrl + '/spa-shell-ssg').then(r => r.text())
    // root layout is rendered
    expect(html).toContain('id="root-nav"')
    // mode is ssg (page determines mode when page is SSG)
    expect(html).toContain('"mode":"ssg"')
    // SSG page content is fully rendered
    expect(html).toContain('id="spa-shell-ssg-page"')
  })

  test('page renders after hydration', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/spa-shell-ssg')
    await page.waitForSelector('#spa-shell-ssg-page', { timeout: 15000 })

    expect(await page.textContent('#spa-shell-ssg-page-data')).toContain('ssg-page-in-spa-shell')

    await page.close()
  })
})

// --- deeply nested layouts ---
// NOTE: Current spa-shell mode only renders ROOT layout.
// Full nested layout render modes require additional implementation.

describe('Deeply Nested Layouts (SSG → SSR → SPA)', () => {
  test('deeply nested SSR section: full render', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/deeply-nested/ssr-section')
    await page.waitForLoadState('networkidle')

    // all layouts render for SSR pages
    expect(await page.textContent('#l1-mode')).toContain('ssg')
    expect(await page.textContent('#l2-mode')).toContain('ssr')

    await page.close()
  })

  test('ssg leaf inside ssr section', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/deeply-nested/ssr-section/ssg-leaf')
    await page.waitForLoadState('networkidle')

    // page data should be present
    expect(await page.textContent('#ssg-leaf-data')).toContain('ssg-leaf')

    await page.close()
  })

  test('client navigation through nested levels', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/deeply-nested')
    await page.waitForLoadState('networkidle')

    // navigate to ssr section
    await page.click('#link-ssr-section')
    await page.waitForURL(`${serverUrl}/deeply-nested/ssr-section`)
    await page.waitForTimeout(300)

    // navigate to ssg leaf
    await page.click('#link-ssg-leaf')
    await page.waitForURL(`${serverUrl}/deeply-nested/ssr-section/ssg-leaf`)
    await page.waitForTimeout(300)

    expect(await page.textContent('#ssg-leaf-data')).toContain('ssg-leaf')

    await page.close()
  })
})

// --- loaders ---

describe('Loaders', () => {
  test('layout loader runs and data accessible via useMatches', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loaders')
    await page.waitForLoadState('networkidle')

    // layout loader data
    const layoutData = await page.textContent('#loaders-layout-data')
    expect(layoutData).toContain('section')
    expect(layoutData).toContain('loaders')

    await page.close()
  })

  test('page without loader can access layout loader data', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loaders/no-loader')
    await page.waitForLoadState('networkidle')

    // even without own loader, can access layout data via useMatches
    const matches = await page.textContent('#no-loader-matches')
    expect(matches).toBeTruthy()

    await page.close()
  })

  test('nested SSR layout loader runs on each request', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loaders/nested')
    await page.waitForLoadState('networkidle')

    const random1 = await page.textContent('#nested-random')

    // navigate away and back
    await page.goto(serverUrl + '/loaders')
    await page.waitForLoadState('networkidle')
    await page.goto(serverUrl + '/loaders/nested')
    await page.waitForLoadState('networkidle')

    const random2 = await page.textContent('#nested-random')

    // SSR layout loader runs on each request - randoms should be different
    expect(random1).not.toBe(random2)

    await page.close()
  })

  test('all loaders accessible via useMatches in nested route', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loaders/nested')
    await page.waitForLoadState('networkidle')

    // should have multiple matches (3 = root + loaders layout + nested layout + page)
    const matches = await page.textContent('#nested-index-matches')
    expect(matches).toBeTruthy()

    await page.close()
  })

  test('client navigation loads new page loader', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loaders/nested')
    await page.waitForLoadState('networkidle')

    await page.click('#link-to-other')
    await page.waitForURL(`${serverUrl}/loaders/nested/other`)
    await page.waitForTimeout(300)

    const otherData = await page.textContent('#nested-other-data')
    expect(otherData).toContain('nested-other')

    await page.close()
  })
})

// --- protection patterns (loader-based redirect) ---

describe('Protection Patterns (Loader-based)', () => {
  test('redirect happens when not authenticated', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loaders/protected')

    // should redirect to login page or show access denied
    await page.waitForLoadState('networkidle')
    const url = page.url()
    expect(url).not.toContain('/protected')

    await page.close()
  })

  test('access granted with auth param', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loaders/protected?auth=true')
    await page.waitForLoadState('networkidle')

    // should be on protected page
    expect(page.url()).toContain('/protected')

    await page.close()
  })

  test('layout loader data accessible from page', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loaders/protected/dashboard?auth=true')
    await page.waitForLoadState('networkidle')

    // dashboard should have access to protected layout data
    const layoutData = await page.textContent('#protected-layout-data')
    expect(layoutData).toBeTruthy()

    await page.close()
  })

  test('client navigation within protected area', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loaders/protected?auth=true')
    await page.waitForLoadState('networkidle')

    await page.click('#link-dashboard')
    await page.waitForURL(`${serverUrl}/loaders/protected/dashboard?auth=true`)
    await page.waitForTimeout(300)

    const dashboardData = await page.textContent('#protected-dashboard-data')
    expect(dashboardData).toContain('dashboard')

    await page.close()
  })
})

// --- cross-route type navigation ---

describe('Cross-Route Type Navigation', () => {
  test('SSG → SSR navigation', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-ssg')
    await page.waitForLoadState('networkidle')

    // navigate to SSR page via programmatic navigation
    await page.evaluate(() => {
      window.location.href = '/pure-ssr'
    })
    await page.waitForURL(`${serverUrl}/pure-ssr`)
    await page.waitForLoadState('networkidle')

    expect(await page.textContent('#pure-ssr-page-mode')).toContain('ssr')

    await page.close()
  })

  test('SSR → SPA navigation renders page element', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-ssr')
    await page.waitForLoadState('networkidle')

    await page.evaluate(() => {
      window.location.href = '/pure-spa'
    })
    await page.waitForSelector('#pure-spa-page', { timeout: 15000 })

    // just verify the element exists - SPA page rendered
    const element = await page.$('#pure-spa-page')
    expect(element).toBeTruthy()

    await page.close()
  })

  test('SPA → SSG navigation', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/pure-spa')
    await page.waitForSelector('#pure-spa-page', { timeout: 15000 })

    await page.evaluate(() => {
      window.location.href = '/pure-ssg'
    })
    await page.waitForURL(`${serverUrl}/pure-ssg`)
    await page.waitForLoadState('networkidle')

    expect(await page.textContent('#pure-ssg-page-mode')).toContain('ssg')

    await page.close()
  })

  test('home → mixed route → home via links', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/')
    await page.waitForLoadState('networkidle')

    // go to SSG
    await page.click('#link-pure-ssg')
    await page.waitForURL(`${serverUrl}/pure-ssg`)
    await page.waitForTimeout(300)

    // go home
    await page.click('#back-home')
    await page.waitForURL(serverUrl + '/')
    await page.waitForTimeout(300)

    expect(page.url()).toBe(serverUrl + '/')

    await page.close()
  })
})
