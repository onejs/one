import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG

// helper to wait for text content to contain a value (replaces fixed timeouts)
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

// helper to wait for URL to match
async function waitForUrl(page: Page, url: string, timeout = 10000) {
  await page.waitForURL(url, { timeout })
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

describe('loader() SSG', () => {
  test('throw redirect() in loader redirects correctly', async () => {
    const page = await context.newPage()

    // Navigate to a page that throws a redirect in its loader
    // retry goto in case the server isn't ready yet
    await page
      .goto(serverUrl + '/loader-redirect', { timeout: 30000 })
      .catch(async () => {
        await page.waitForTimeout(2000)
        await page.goto(serverUrl + '/loader-redirect', { timeout: 30000 })
      })

    // Should have been redirected to /loader
    expect(page.url()).toBe(`${serverUrl}/loader`)

    // Should see the loader page content, not the redirect page
    const textContent = await page.textContent('#loader-data')
    expect(textContent).toContain('loader-success')

    await page.close()
  })

  test('initial load with loader, then navigate to a new loader', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader')

    const textContent = await page.textContent('#loader-data')
    expect(textContent).toContain('loader-success')

    const link = await page.$('a[href="/loader/other"]')
    await link?.click({
      force: true,
    })

    await page.waitForURL(`${serverUrl}/loader/other`, { timeout: 5000 })
    await waitForTextContent(page, '#loader-data-two', 'loader-success-two')

    expect(page.url()).toBe(`${serverUrl}/loader/other`)
    expect(await page.textContent('#loader-data-two')).toContain('loader-success-two')

    await page.close()
  })

  test.skip('loader data stays the same on back/forward', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/')

    expect(await page.textContent('#test-loader')).toBe('{"test":"hello"}')

    await page.click('#go-to-sub')
    await new Promise((res) => setTimeout(res, 500))

    expect(page.url()).toBe(`${serverUrl}/sub-page/sub`)

    await page.goBack()

    expect(page.url()).toBe(`${serverUrl}/`)

    expect(await page.textContent('#test-loader')).toBe('{"test":"hello"}')

    await page.close()
  })

  test.skip('loader refetches when search params change', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch')

    // Initial load
    expect(await page.textContent('#loader-query')).toContain('Query: default')
    const initialTimestampText = await page.textContent('#loader-timestamp')

    // Change search params via navigation
    await page.fill('#query-input', 'hello')
    await page.click('#update-search')
    await new Promise((res) => setTimeout(res, 500))

    // Loader should have refetched with new search param
    expect(await page.textContent('#loader-query')).toContain('Query: hello')
    const afterFirstNavTimestamp = await page.textContent('#loader-timestamp')
    expect(afterFirstNavTimestamp).not.toBe(initialTimestampText)

    // Change search params again
    await page.fill('#query-input', 'world')
    await page.click('#update-search')
    await new Promise((res) => setTimeout(res, 500))

    // Loader should have refetched again
    expect(await page.textContent('#loader-query')).toContain('Query: world')
    const afterSecondNavTimestamp = await page.textContent('#loader-timestamp')
    expect(afterSecondNavTimestamp).not.toBe(afterFirstNavTimestamp)

    await page.close()
  })

  test('useLoaderState refetch works from child component', async () => {
    const page = await context.newPage()

    // Capture browser console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/loader-refetch')

    // Wait for client-side hydration (timestamp becomes visible)
    await page.waitForFunction(
      () =>
        !document.querySelector('#loader-timestamp')?.textContent?.includes('loading'),
      { timeout: 5000 }
    )

    // Initial load - SSG pages don't have search params at build time
    expect(await page.textContent('#loader-query')).toContain('Query: default')
    const initialTimestamp = await page.textContent('#loader-timestamp')
    console.log('Initial timestamp:', initialTimestamp)

    // Button should show "Refetch" when idle
    expect(await page.textContent('#refetch-button')).toBe('Refetch')

    // Click refetch button (in child component)
    console.log('Clicking refetch button')
    await page.click('#refetch-button')

    // After refetch completes
    console.log('Waiting for refetch to complete')
    await waitForTextContent(page, '#refetch-button', 'Refetch')

    // Button should be back to "Refetch"
    expect(await page.textContent('#refetch-button')).toBe('Refetch')

    // Query should stay the same (no search params) but timestamp should change
    expect(await page.textContent('#loader-query')).toContain('Query: default')
    const newTimestamp = await page.textContent('#loader-timestamp')
    console.log('New timestamp:', newTimestamp)
    expect(newTimestamp).not.toBe(initialTimestamp)

    await page.close()
  })

  test('simple SPA refetch', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/simple-spa-refetch')

    // Initial load
    const initialCount = await page.textContent('#spa-count')
    const initialCountNum = parseInt(initialCount?.match(/\d+/)?.[0] || '0')

    // Click refetch and wait for count to increment
    await page.click('#spa-refetch-btn')
    await page.waitForFunction(
      ([sel, prevCount]) => {
        const text = document.querySelector(sel)?.textContent || ''
        const count = parseInt(text.match(/\d+/)?.[0] || '0')
        return count > prevCount
      },
      ['#spa-count', initialCountNum] as const,
      { timeout: 10000 }
    )

    // Count should have incremented
    const newCount = await page.textContent('#spa-count')
    const newCountNum = parseInt(newCount?.match(/\d+/)?.[0] || '0')
    expect(newCountNum).toBeGreaterThan(initialCountNum)

    await page.close()
  })

  test.skip('SPA mode: loader refetches on search params and manual refetch', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch/spa')

    // Initial load
    expect(await page.textContent('#spa-mode')).toBe('Mode: spa')
    expect(await page.textContent('#spa-query')).toContain('spa-default')
    const initialCountText = await page.textContent('#spa-call-count')
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || '0')

    // Navigate with new search params
    await page.click('#spa-search-test')
    await waitForTextContent(page, '#spa-query', 'spa-test')

    expect(await page.textContent('#spa-query')).toContain('spa-test')
    const afterNavCountText = await page.textContent('#spa-call-count')
    const afterNavCount = parseInt(afterNavCountText?.match(/\d+/)?.[0] || '0')
    expect(afterNavCount).toBeGreaterThan(initialCount)

    // Manual refetch - wait for call count to change
    const beforeRefetchText = await page.textContent('#spa-call-count')
    await page.click('#spa-refetch')
    await page.waitForFunction(
      ([sel, prev]) => document.querySelector(sel)?.textContent !== prev,
      ['#spa-call-count', beforeRefetchText] as const,
      { timeout: 10000 }
    )

    const afterRefetchCountText = await page.textContent('#spa-call-count')
    const afterRefetchCount = parseInt(afterRefetchCountText?.match(/\d+/)?.[0] || '0')
    expect(afterRefetchCount).toBeGreaterThan(afterNavCount)

    await page.close()
  })

  test.skip('SSR mode: manual refetch works', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch/ssr')

    // Initial load
    expect(await page.textContent('#ssr-mode')).toBe('Mode: ssr')
    const initialTimestampText = await page.textContent('#ssr-call-count')

    // Manual refetch - wait for call count to change
    await page.click('#ssr-refetch')
    await page.waitForFunction(
      ([sel, prev]) => document.querySelector(sel)?.textContent !== prev,
      ['#ssr-call-count', initialTimestampText] as const,
      { timeout: 10000 }
    )

    // Timestamp should have changed
    const afterRefetchTimestampText = await page.textContent('#ssr-call-count')
    expect(afterRefetchTimestampText).not.toBe(initialTimestampText)

    await page.close()
  })

  test.skip('SSR mode: loader refetches on search params and manual refetch', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch/ssr')

    // Initial load
    expect(await page.textContent('#ssr-mode')).toBe('Mode: ssr')
    expect(await page.textContent('#ssr-query')).toContain('ssr-default')
    const initialExecutedOn = await page.textContent('#ssr-executed-on')
    // Initial SSR load should be on server
    expect(initialExecutedOn).toContain('server')
    const initialCountText = await page.textContent('#ssr-call-count')
    const initialCount = parseInt(initialCountText?.match(/\d+/)?.[0] || '0')

    // Navigate with new search params
    await page.click('#ssr-search-test')
    await waitForTextContent(page, '#ssr-query', 'ssr-test')

    expect(await page.textContent('#ssr-query')).toContain('ssr-test')
    const afterNavCountText = await page.textContent('#ssr-call-count')
    const afterNavCount = parseInt(afterNavCountText?.match(/\d+/)?.[0] || '0')
    expect(afterNavCount).toBeGreaterThan(initialCount)

    // Manual refetch - wait for count to change
    const beforeRefetchText = await page.textContent('#ssr-call-count')
    await page.click('#ssr-refetch')
    await page.waitForFunction(
      ([sel, prev]) => document.querySelector(sel)?.textContent !== prev,
      ['#ssr-call-count', beforeRefetchText] as const,
      { timeout: 10000 }
    )

    const afterRefetchCountText = await page.textContent('#ssr-call-count')
    const afterRefetchCount = parseInt(afterRefetchCountText?.match(/\d+/)?.[0] || '0')
    expect(afterRefetchCount).toBeGreaterThan(afterNavCount)

    // Log where it executed for debugging
    const refetchExecutedOn = await page.textContent('#ssr-executed-on')
    console.log('SSR refetch executed on:', refetchExecutedOn)

    await page.close()
  })

  test('useLoaderState with loader provides data, refetch, and state', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-refetch')

    // Wait for client-side hydration
    await page.waitForFunction(
      () =>
        !document.querySelector('#loader-timestamp')?.textContent?.includes('loading'),
      { timeout: 5000 }
    )

    // Check initial state
    expect(await page.textContent('#refetch-button')).toBe('Refetch')

    // Data should be available
    expect(await page.textContent('#loader-query')).toContain('Query:')
    expect(await page.textContent('#loader-timestamp')).toContain('Timestamp:')

    // Get initial timestamp
    const initialTimestamp = await page.textContent('#loader-timestamp')

    // Test multiple rapid refetches
    for (let i = 0; i < 3; i++) {
      const beforeText = await page.textContent('#loader-timestamp')
      await page.click('#refetch-button')
      await page.waitForFunction(
        ([sel, prev]) => document.querySelector(sel)?.textContent !== prev,
        ['#loader-timestamp', beforeText] as const,
        { timeout: 10000 }
      )
    }

    // Timestamp should have changed after refetches
    const finalTimestamp = await page.textContent('#loader-timestamp')
    expect(finalTimestamp).not.toBe(initialTimestamp)

    await page.close()
  })

  test.skip('loader refetches on pathname change and manual refetch', async () => {
    const page = await context.newPage()

    // Capture browser console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    // Preload both pages to avoid dev mode rebuild issues
    await page.goto(serverUrl + '/loader-state/page1')
    await page.waitForSelector('#page-name', { timeout: 5000 })

    await page.goto(serverUrl + '/loader-state/page2')
    await page.waitForSelector('#page-name', { timeout: 5000 })

    // Now start the actual test - go back to page1
    await page.goto(serverUrl + '/loader-state/page1')
    expect(await page.textContent('#page-name')).toBe('Page: page1')
    const page1InitialCount = parseInt(
      (await page.textContent('#call-count'))?.match(/\d+/)?.[0] || '0'
    )
    console.log('Page1 initial count:', page1InitialCount)

    // Manual refetch on page1
    const page1BeforeText = await page.textContent('#call-count')
    await page.click('#refetch-btn')
    await page.waitForFunction(
      ([sel, prev]) => document.querySelector(sel)?.textContent !== prev,
      ['#call-count', page1BeforeText] as const,
      { timeout: 10000 }
    )

    const page1AfterRefetch = parseInt(
      (await page.textContent('#call-count'))?.match(/\d+/)?.[0] || '0'
    )
    console.log('Page1 after refetch:', page1AfterRefetch)
    expect(page1AfterRefetch).toBeGreaterThan(page1InitialCount)

    // Navigate to page2
    await page.click('#go-to-page2')
    await waitForTextContent(page, '#page-name', 'page2')

    expect(await page.textContent('#page-name')).toBe('Page: page2')
    const page2InitialCount = parseInt(
      (await page.textContent('#call-count'))?.match(/\d+/)?.[0] || '0'
    )
    console.log('Page2 initial count:', page2InitialCount)

    // Manual refetch on page2
    const page2BeforeText = await page.textContent('#call-count')
    await page.click('#refetch-btn')
    await page.waitForFunction(
      ([sel, prev]) => document.querySelector(sel)?.textContent !== prev,
      ['#call-count', page2BeforeText] as const,
      { timeout: 10000 }
    )

    const page2AfterRefetch = parseInt(
      (await page.textContent('#call-count'))?.match(/\d+/)?.[0] || '0'
    )
    console.log('Page2 after refetch:', page2AfterRefetch)
    expect(page2AfterRefetch).toBeGreaterThan(page2InitialCount)

    await page.close()
  })

  test('simple refetch test', async () => {
    const page = await context.newPage()

    // Capture browser console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    page.on('pageerror', (error) => {
      console.error('[Browser Error]', error.message)
    })

    console.log('Navigating to /simple-refetch')
    await page.goto(serverUrl + '/simple-refetch')

    // Wait for hydration and client-side rendering
    await page.waitForTimeout(1500)

    // Wait for timestamp to be loaded (not "loading")
    await page.waitForFunction(
      () => !document.querySelector('#timestamp')?.textContent?.includes('loading'),
      { timeout: 5000 }
    )

    // Get initial state
    console.log('Getting initial state')
    const initialTimestamp = await page.textContent('#timestamp')
    const initialRandom = await page.textContent('#random')
    console.log('Initial timestamp:', initialTimestamp)
    console.log('Initial random:', initialRandom)
    expect(await page.textContent('#changed')).toBe('Changed: NO')
    expect(await page.textContent('#state')).toBe('State: idle')

    // Click refetch
    console.log('Clicking refetch button')
    await page.waitForSelector('#refetch-btn', { state: 'visible' })
    const beforeRefetchText = await page.textContent('#timestamp')
    await page.click('#refetch-btn')

    console.log('Waiting for refetch to complete')
    await page.waitForFunction(
      ([sel, prev]) => document.querySelector(sel)?.textContent !== prev,
      ['#timestamp', beforeRefetchText] as const,
      { timeout: 10000 }
    )

    // Check if data changed
    console.log('Checking if data changed')
    const newTimestamp = await page.textContent('#timestamp')
    const newRandom = await page.textContent('#random')
    console.log('New timestamp:', newTimestamp)
    console.log('New random:', newRandom)
    console.log('Timestamps equal?', newTimestamp === initialTimestamp)
    expect(newTimestamp).not.toBe(initialTimestamp)
    expect(await page.textContent('#changed')).toBe('Changed: YES')

    await page.close()
  })

  test('useLoaderState loading state transitions', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/loader-state/page2')

    // Initial state should be idle
    expect(await page.textContent('#load-state')).toBe('State: idle')

    // Click refetch and immediately check state
    await page.click('#refetch-btn')
    // The button text should change to Loading...
    const buttonText = await page.textContent('#refetch-btn')
    console.log('Button text during refetch:', buttonText)

    // Wait for completion
    await waitForTextContent(page, '#load-state', 'idle')

    // Should be back to idle
    expect(await page.textContent('#load-state')).toBe('State: idle')

    await page.close()
  })

  test('useLoader and useLoaderState share the same cache', async () => {
    const page = await context.newPage()

    // Capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    console.log('Navigating to /shared-cache')
    await page.goto(serverUrl + '/shared-cache')
    await page.waitForSelector('#useloader-timestamp', { timeout: 5000 })

    // Wait for client-side rendering
    await page.waitForFunction(
      () =>
        !document.querySelector('#useloader-timestamp')?.textContent?.includes('loading'),
      { timeout: 5000 }
    )

    // Get initial data from both hooks
    const initialUseLoaderText = await page.textContent('#useloader-timestamp')
    const initialUseLoaderStateText = await page.textContent('#useloaderstate-timestamp')

    console.log('Initial useLoader timestamp:', initialUseLoaderText)
    console.log('Initial useLoaderState timestamp:', initialUseLoaderStateText)

    // Extract timestamps from the text
    const initialUseLoaderTimestamp = initialUseLoaderText?.split(': ')[1]
    const initialUseLoaderStateTimestamp = initialUseLoaderStateText?.split(': ')[1]

    // Both should have the same timestamp initially
    expect(initialUseLoaderTimestamp).toBe(initialUseLoaderStateTimestamp)

    // Refetch using useLoaderState
    console.log('Clicking refetch button')
    const beforeRefetch = await page.textContent('#useloader-timestamp')
    await page.click('#refetch-btn')

    console.log('Waiting for refetch to complete')
    await page.waitForFunction(
      ([sel, prev]) => document.querySelector(sel)?.textContent !== prev,
      ['#useloader-timestamp', beforeRefetch] as const,
      { timeout: 10000 }
    )

    // Get new data from both hooks
    const newUseLoaderText = await page.textContent('#useloader-timestamp')
    const newUseLoaderStateText = await page.textContent('#useloaderstate-timestamp')

    console.log('New useLoader timestamp:', newUseLoaderText)
    console.log('New useLoaderState timestamp:', newUseLoaderStateText)

    // Extract timestamps from the text
    const newUseLoaderTimestamp = newUseLoaderText?.split(': ')[1]
    const newUseLoaderStateTimestamp = newUseLoaderStateText?.split(': ')[1]

    // Both should have the same NEW timestamp
    expect(newUseLoaderTimestamp).toBe(newUseLoaderStateTimestamp)

    // And it should be different from the initial
    expect(newUseLoaderTimestamp).not.toBe(initialUseLoaderTimestamp)

    // Verify refetch count incremented
    expect(await page.textContent('#refetch-count')).toBe('Refetch count: 1')

    await page.close()
  })

  test('dynamic SSG route with loader works on client-side navigation', async () => {
    const page = await context.newPage()

    // start at posts index
    await page.goto(serverUrl + '/posts')

    // wait for hydration
    await page.waitForLoadState('networkidle')

    // click the link to navigate to hello-world post
    const link = await page.$('#link-hello')
    await link?.click({ force: true })

    // wait for navigation
    await page.waitForURL(`${serverUrl}/posts/hello-world`, { timeout: 5000 })

    // loader data should be present
    const title = await page.textContent('#post-title')
    expect(title).toBe('Post: hello-world')

    const content = await page.textContent('#post-content')
    expect(content).toBe('This is the content for hello-world')

    await page.close()
  })

  test('dynamic SSG route with loader works on direct navigation', async () => {
    const page = await context.newPage()

    // navigate directly to a post
    await page.goto(serverUrl + '/posts/another-post')

    // loader data should be present
    const title = await page.textContent('#post-title')
    expect(title).toBe('Post: another-post')

    const content = await page.textContent('#post-content')
    expect(content).toBe('This is the content for another-post')

    await page.close()
  })
})

describe('useMatches()', () => {
  test('SSR: useMatches returns all matched routes with loader data', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/matches-test/page1')

    // debug: show all matches
    const allMatches = await page.textContent('#all-matches-debug')
    console.log('All matches:', allMatches)

    // should see 3+ matches (root layout, matches-test layout, page1)
    const matchesCount = await page.textContent('#page-matches-count')
    console.log('Matches count text:', matchesCount)
    expect(matchesCount).toContain('matches')

    // layout should have its loader data
    const layoutData = await page.textContent('#layout-loader-data')
    console.log('Layout data text:', layoutData)
    expect(layoutData).toContain('layoutTitle')
    expect(layoutData).toContain('Matches Test Layout')

    // page should have its loader data
    const pageData = await page.textContent('#page-loader-data')
    console.log('Page data text:', pageData)
    expect(pageData).toContain('pageTitle')
    expect(pageData).toContain('Page 1')

    await page.close()
  })

  test('client navigation: useMatches updates after navigation', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    // start at page1
    await page.goto(serverUrl + '/matches-test/page1')
    await page.waitForLoadState('networkidle')

    // verify initial state
    const page1Title = await page.textContent('#page-title')
    console.log('Page1 title:', page1Title)
    expect(page1Title).toBe('Page 1')

    const page1Data = await page.textContent('#page-loader-data')
    console.log('Page1 data:', page1Data)
    expect(page1Data).toContain('Page 1')

    // navigate to page2 via client-side link
    console.log('Clicking link to page2...')
    await page.click('#link-to-page2')
    await page.waitForURL(`${serverUrl}/matches-test/page2`, { timeout: 5000 })

    // wait for page2 content to load
    await waitForTextContent(page, '#page-title', 'Page 2')

    // debug: show all matches after navigation
    const allMatches = await page.textContent('#all-matches-debug')
    console.log('All matches after nav:', allMatches)

    // page match should update to page2's data
    const page2Title = await page.textContent('#page-title')
    console.log('Page2 title:', page2Title)
    expect(page2Title).toBe('Page 2')

    const page2Data = await page.textContent('#page-loader-data')
    console.log('Page2 data:', page2Data)
    expect(page2Data).toContain('Page 2')

    // layout data should still be present (cached from SSR)
    const layoutData = await page.textContent('#layout-loader-data')
    console.log('Layout data after nav:', layoutData)
    expect(layoutData).toContain('layoutTitle')

    await page.close()
  })

  test('layout can access page loader data via useMatches', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/matches-test/page1')

    // the layout renders its own view of matches
    const layoutMatchesData = await page.textContent('#layout-matches-data')

    // should be a JSON array with multiple matches
    const parsed = JSON.parse(layoutMatchesData || '[]')
    expect(Array.isArray(parsed)).toBe(true)
    expect(parsed.length).toBeGreaterThan(0)

    // at least one match should have loader data
    const hasLoaderData = parsed.some(
      (m: { routeId: string; hasLoaderData: boolean }) => m.hasLoaderData
    )
    expect(hasLoaderData).toBe(true)

    await page.close()
  })

  test('deeply nested layouts: 3+ levels of layout loaders', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/nested-test/level2/page')
    await page.waitForLoadState('networkidle')

    // should have 4 matches: root _layout, nested-test/_layout, level2/_layout, page
    const totalMatches = await page.textContent('[data-testid="nested-total-matches"]')
    console.log('Total matches:', totalMatches)
    expect(totalMatches).toContain('4')

    // level1 layout data should be accessible
    const level1Data = await page.textContent('[data-testid="nested-level1-data"]')
    console.log('Level1 data:', level1Data)
    expect(level1Data).toContain('"level":1')
    expect(level1Data).toContain('"name":"Level 1 Layout"')

    // level2 layout data should be accessible
    const level2Data = await page.textContent('[data-testid="nested-level2-data"]')
    console.log('Level2 data:', level2Data)
    expect(level2Data).toContain('"level":2')
    expect(level2Data).toContain('"name":"Level 2 Layout"')

    // page data should be accessible
    const pageData = await page.textContent('[data-testid="nested-page-match-data"]')
    console.log('Page match data:', pageData)
    expect(pageData).toContain('"level":3')
    expect(pageData).toContain('"name":"Nested Page"')

    await page.close()
  })

  test('dynamic routes: useMatches includes params from URL', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/posts/hello-world')
    await page.waitForLoadState('networkidle')

    // verify page content (loader is working with params)
    const title = await page.textContent('#post-title')
    console.log('Post title:', title)
    expect(title).toBe('Post: hello-world')

    // verify matches include params
    const pageParams = await page.textContent('#post-page-params')
    console.log('Page params:', pageParams)
    expect(pageParams).toContain('"slug":"hello-world"')

    // verify we have matches
    const matchesCount = await page.textContent('#post-matches-count')
    console.log('Matches count:', matchesCount)
    expect(matchesCount).toContain('Matches: 2') // root layout + page

    await page.close()
  })

  // TODO: This test verifies error handling in layout loaders. The production server
  // handles this correctly (individual loader errors are caught and return undefined
  // loaderData), but the dev server has timing issues with the test setup.
  test.skip('error handling: page loader runs even when layout loader throws', async () => {
    const page = await context.newPage()

    // capture console logs
    page.on('console', (msg) => {
      console.log('[Browser]', msg.text())
    })

    await page.goto(serverUrl + '/error-test')
    await page.waitForLoadState('networkidle')

    // page should still render with its loader data
    const pageData = await page.textContent('[data-testid="error-test-page-data"]')
    console.log('Page data:', pageData)
    expect(pageData).toContain('pageData')
    expect(pageData).toContain('This page loader should still run')

    // matches should include the layout match (with undefined loaderData) and page match
    const matchesCount = await page.textContent(
      '[data-testid="error-test-matches-count"]'
    )
    console.log('Matches count:', matchesCount)
    // should have 3 matches: root layout, error-test layout, page
    expect(matchesCount).toContain('Matches: 3')

    // the error layout's data should be undefined/null since it threw
    const allMatches = await page.textContent('[data-testid="error-test-all-matches"]')
    console.log('All matches:', allMatches)
    const matches = JSON.parse(allMatches || '[]')
    const errorLayoutMatch = matches.find(
      (m: { routeId: string }) => m.routeId === './error-test/_layout.tsx'
    )
    // loader threw, so loaderData should be undefined
    expect(errorLayoutMatch?.loaderData).toBeUndefined()

    // page match should have its data
    const pageMatch = matches.find(
      (m: { routeId: string }) => m.routeId === './error-test/page+ssg.tsx'
    )
    expect(pageMatch?.loaderData).toBeDefined()
    expect(pageMatch?.loaderData?.pageData).toBe('This page loader should still run')

    await page.close()
  })

  test('useMatch: finds specific route by routeId', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/matches-test/hooks-test')
    await page.waitForLoadState('networkidle')

    // should find the layout match
    const layoutMatchFound = await page.textContent('[data-testid="layout-match-found"]')
    expect(layoutMatchFound).toContain('yes')

    // layout match should have correct routeId
    const layoutRouteId = await page.textContent('[data-testid="layout-match-routeid"]')
    expect(layoutRouteId).toContain('matches-test/_layout')

    // layout match should have loader data
    const layoutData = await page.textContent('[data-testid="layout-match-data"]')
    expect(layoutData).toContain('layoutTitle')
    expect(layoutData).toContain('Matches Test Layout')

    await page.close()
  })

  test('useMatch: returns undefined for non-existent routeId', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/matches-test/hooks-test')
    await page.waitForLoadState('networkidle')

    // should NOT find invalid match
    const invalidMatchFound = await page.textContent(
      '[data-testid="invalid-match-found"]'
    )
    expect(invalidMatchFound).toContain('no')

    await page.close()
  })

  test('usePageMatch: returns current page match', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/matches-test/hooks-test')
    await page.waitForLoadState('networkidle')

    // should find page match
    const pageMatchFound = await page.textContent('[data-testid="page-match-found"]')
    expect(pageMatchFound).toContain('yes')

    // page match routeId should contain hooks-test
    const pageRouteId = await page.textContent('[data-testid="page-match-routeid"]')
    expect(pageRouteId).toContain('hooks-test')

    // page match should have loader data
    const pageData = await page.textContent('[data-testid="page-match-data"]')
    expect(pageData).toContain('pageTitle')
    expect(pageData).toContain('Hooks Test Page')

    // page match should have empty params (not a dynamic route)
    const pageParams = await page.textContent('[data-testid="page-match-params"]')
    expect(pageParams).toContain('{}')

    await page.close()
  })

  test('hydration: matches are consistent after hydration', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/matches-test/hooks-test')
    await page.waitForLoadState('networkidle')

    // get matches from hydrated page
    const matchesText = await page.textContent('[data-testid="all-matches"]')
    const matches = JSON.parse(matchesText || '[]')

    // should have matches (root layout + matches-test layout + page = 3)
    expect(matches.length).toBeGreaterThanOrEqual(3)

    // verify structure of each match
    for (const match of matches) {
      expect(match).toHaveProperty('routeId')
      expect(match).toHaveProperty('pathname')
      expect(match).toHaveProperty('params')
      expect(match.pathname).toBe('/matches-test/hooks-test')
    }

    // verify specific matches exist
    const hasLayoutMatch = matches.some((m: { routeId: string }) =>
      m.routeId.includes('matches-test/_layout')
    )
    const hasPageMatch = matches.some((m: { routeId: string }) =>
      m.routeId.includes('hooks-test')
    )

    expect(hasLayoutMatch).toBe(true)
    expect(hasPageMatch).toBe(true)

    await page.close()
  })

  test('cross-route-type navigation: SSG → SPA', async () => {
    const page = await context.newPage()

    // start at SSG page
    await page.goto(serverUrl + '/matches-test/page1')
    await page.waitForLoadState('networkidle')

    // verify we're on SSG page
    const ssgTitle = await page.textContent('#page-title')
    expect(ssgTitle).toBe('Page 1')

    // navigate to SPA page
    await page.click('a[href="/matches-test/spa-page"]')
    await page.waitForURL(`${serverUrl}/matches-test/spa-page`, { timeout: 5000 })
    await waitForTextContent(page, '#page-title', 'SPA Page')

    // verify SPA page data loaded
    const spaTitle = await page.textContent('#page-title')
    expect(spaTitle).toBe('SPA Page')

    const routeType = await page.textContent('#route-type')
    expect(routeType).toContain('spa')

    // verify matches updated
    const matchesCount = await page.textContent('#matches-count')
    expect(matchesCount).toContain('Matches:')

    await page.close()
  })

  test('cross-route-type navigation: SPA → SSR', async () => {
    const page = await context.newPage()

    // start at SPA page
    await page.goto(serverUrl + '/matches-test/spa-page')
    await page.waitForLoadState('networkidle')

    // verify we're on SPA page
    const spaTitle = await page.textContent('#page-title')
    expect(spaTitle).toBe('SPA Page')

    // navigate to SSR page
    await page.click('#link-to-ssr')
    await page.waitForURL(`${serverUrl}/matches-test/ssr-page`, { timeout: 5000 })
    await waitForTextContent(page, '#page-title', 'SSR Page')

    // verify SSR page data loaded
    const ssrTitle = await page.textContent('#page-title')
    expect(ssrTitle).toBe('SSR Page')

    const routeType = await page.textContent('#route-type')
    expect(routeType).toContain('ssr')

    await page.close()
  })

  test('cross-route-type navigation: SSR → SSG', async () => {
    const page = await context.newPage()

    // start at SSR page
    await page.goto(serverUrl + '/matches-test/ssr-page')
    await page.waitForLoadState('networkidle')

    // verify we're on SSR page
    const ssrTitle = await page.textContent('#page-title')
    expect(ssrTitle).toBe('SSR Page')

    // navigate to SSG page
    await page.click('#link-to-ssg')
    await page.waitForURL(`${serverUrl}/matches-test/page1`, { timeout: 5000 })
    await waitForTextContent(page, '#page-title', 'Page 1')

    // verify SSG page data loaded
    const ssgTitle = await page.textContent('#page-title')
    expect(ssgTitle).toBe('Page 1')

    // verify pageMatch updated correctly
    const pageData = await page.textContent('#page-loader-data')
    expect(pageData).toContain('Page 1')

    await page.close()
  })

  test('useMatch: finds layout data after client navigation within same layout', async () => {
    const page = await context.newPage()

    // start at page1 (direct navigation)
    await page.goto(serverUrl + '/matches-test/page1')
    await page.waitForLoadState('networkidle')

    // verify we're on page1
    expect(await page.textContent('#page-title')).toBe('Page 1')

    // client navigate to hooks-test page (same layout)
    await page.click('#link-to-hooks-test')
    await page.waitForURL(`${serverUrl}/matches-test/hooks-test`, { timeout: 5000 })
    await waitForTextContent(page, '[data-testid="layout-match-found"]', 'yes')

    // useMatch should still find layout data after client navigation
    const layoutMatchFound = await page.textContent('[data-testid="layout-match-found"]')
    expect(layoutMatchFound).toContain('yes')

    // layout loader data should be available
    const layoutData = await page.textContent('[data-testid="layout-match-data"]')
    expect(layoutData).toContain('layoutTitle')
    expect(layoutData).toContain('Matches Test Layout')

    await page.close()
  })

  test('useMatch: layout data persists across multiple client navigations', async () => {
    const page = await context.newPage()

    // start at hooks-test (direct navigation)
    await page.goto(serverUrl + '/matches-test/hooks-test')
    await page.waitForLoadState('networkidle')

    // verify initial layout data
    const initialData = await page.textContent('[data-testid="layout-match-data"]')
    expect(initialData).toContain('Matches Test Layout')

    // navigate to page1
    await page.click('#link-to-page1')
    await page.waitForURL(`${serverUrl}/matches-test/page1`, { timeout: 5000 })
    await waitForTextContent(page, '#page-title', 'Page 1')

    // navigate back to hooks-test
    await page.click('#link-to-hooks-test')
    await page.waitForURL(`${serverUrl}/matches-test/hooks-test`, { timeout: 5000 })
    await waitForTextContent(page, '[data-testid="layout-match-found"]', 'yes')

    // layout data should still be available
    const afterNavData = await page.textContent('[data-testid="layout-match-data"]')
    expect(afterNavData).toContain('layoutTitle')
    expect(afterNavData).toContain('Matches Test Layout')

    await page.close()
  })
})

describe('not-found with loaders', () => {
  // helper: collect console errors during a page visit
  function collectErrors(page: Page) {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text())
    })
    page.on('pageerror', (err) => errors.push(err.message))
    return errors
  }

  // -- valid slugs still work --

  test('valid deep slug with loader renders correctly', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    await page.goto(serverUrl + '/not-found/deep/valid-item')
    await page.waitForSelector('#deep-title', { timeout: 10000 })

    expect(await page.textContent('#deep-title')).toBe('Deep: valid-item')
    expect(await page.textContent('#deep-content')).toBe('content for valid-item')
    expect(errors.filter((e) => e.includes('Cannot destructure'))).toHaveLength(0)

    await page.close()
  })

  test('valid fallback slug with loader renders correctly', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    await page.goto(serverUrl + '/not-found/fallback/valid-entry')
    await page.waitForSelector('#fallback-title', { timeout: 10000 })

    expect(await page.textContent('#fallback-title')).toBe('Fallback: valid-entry')
    expect(await page.textContent('#fallback-content')).toBe('content for valid-entry')
    expect(errors.filter((e) => e.includes('Cannot destructure'))).toHaveLength(0)

    await page.close()
  })

  // -- missing slug: nested +not-found exists --

  test('missing slug with nested +not-found shows 404 without crashing', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    const response = await page.goto(serverUrl + '/not-found/deep/missing-item', {
      timeout: 30000,
    })
    await page.waitForLoadState('networkidle')

    // server should return 404 status
    expect(response?.status()).toBe(404)

    // should show the nested not-found page content
    await page.waitForSelector('#not-found-message', { timeout: 10000 })
    expect(await page.textContent('#not-found-message')).toBe('deep not found')

    // no destructuring crashes
    const hasCrash = errors.some(
      (e) => e.includes('Cannot destructure') || e.includes('Cannot read properties of')
    )
    expect(hasCrash).toBe(false)

    await page.close()
  })

  // -- missing slug: no nested +not-found, falls back to root --

  test('missing slug without nested +not-found falls back to root 404', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    const response = await page.goto(serverUrl + '/not-found/fallback/missing-entry', {
      timeout: 30000,
    })
    await page.waitForLoadState('networkidle')

    // server should return 404 status
    expect(response?.status()).toBe(404)

    // should show root not-found content (no nested +not-found in fallback/)
    await page.waitForSelector('#not-found-message', { timeout: 10000 })
    expect(await page.textContent('#not-found-message')).toBe('root not found')

    // no destructuring crashes
    const hasCrash = errors.some(
      (e) => e.includes('Cannot destructure') || e.includes('Cannot read properties of')
    )
    expect(hasCrash).toBe(false)

    await page.close()
  })

  // -- missing slug on posts (no +not-found at all in posts/) --

  test('missing post slug shows root 404 without crashing', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    const response = await page.goto(serverUrl + '/posts/nonexistent-post', {
      timeout: 30000,
    })
    await page.waitForLoadState('networkidle')

    expect(response?.status()).toBe(404)

    await page.waitForSelector('#not-found-message', { timeout: 10000 })
    expect(await page.textContent('#not-found-message')).toBe('root not found')

    const hasCrash = errors.some(
      (e) => e.includes('Cannot destructure') || e.includes('Cannot read properties of')
    )
    expect(hasCrash).toBe(false)

    await page.close()
  })

  // -- client-side navigation to missing slug --

  test('client-side nav to missing slug with nested +not-found does not crash', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    // start at the test index page
    await page.goto(serverUrl + '/not-found/test', { timeout: 30000 })
    await page.waitForSelector('#link-missing-deep', { timeout: 10000 })

    // click link to a missing slug under deep/ (which has its own +not-found)
    await page.click('#link-missing-deep')
    await page.waitForLoadState('networkidle')

    // should show not-found content, no crash
    await page.waitForSelector('#not-found-message', { timeout: 10000 })

    const hasCrash = errors.some(
      (e) => e.includes('Cannot destructure') || e.includes('Cannot read properties of')
    )
    expect(hasCrash).toBe(false)

    await page.close()
  })

  test('client-side nav to missing slug without nested +not-found does not crash', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    await page.goto(serverUrl + '/not-found/test', { timeout: 30000 })
    await page.waitForSelector('#link-missing-fallback', { timeout: 10000 })

    // click link to a missing slug under fallback/ (no +not-found, falls back to root)
    await page.click('#link-missing-fallback')
    await page.waitForLoadState('networkidle')

    await page.waitForSelector('#not-found-message', { timeout: 10000 })

    const hasCrash = errors.some(
      (e) => e.includes('Cannot destructure') || e.includes('Cannot read properties of')
    )
    expect(hasCrash).toBe(false)

    await page.close()
  })

  test('client-side nav to missing post does not crash', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    // start at the posts index
    await page.goto(serverUrl + '/posts', { timeout: 30000 })
    await page.waitForLoadState('networkidle')

    // navigate via JS to a missing slug
    await page.evaluate(() => {
      ;(window as any).__oneRouter?.push('/posts/nonexistent-post')
    })
    await page.waitForLoadState('networkidle')

    // wait a bit for the router to settle
    await page.waitForTimeout(2000)

    const hasCrash = errors.some(
      (e) => e.includes('Cannot destructure') || e.includes('Cannot read properties of')
    )
    expect(hasCrash).toBe(false)

    await page.close()
  })

  // -- completely unknown path (no matching dynamic route) --

  test('completely unknown path shows root 404', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    const response = await page.goto(serverUrl + '/this/path/does/not/exist', {
      timeout: 30000,
    })
    await page.waitForLoadState('networkidle')

    expect(response?.status()).toBe(404)

    await page.waitForSelector('#not-found-message', { timeout: 10000 })
    expect(await page.textContent('#not-found-message')).toBe('root not found')

    const hasCrash = errors.some(
      (e) => e.includes('Cannot destructure') || e.includes('Cannot read properties of')
    )
    expect(hasCrash).toBe(false)

    await page.close()
  })

  // -- navigate AWAY from a 404 page via layout link --

  test('can client-side navigate away from 404 via layout link', async () => {
    const page = await context.newPage()
    const errors = collectErrors(page)

    // land on a missing slug — should show the nested 404
    await page.goto(serverUrl + '/not-found/deep/missing-item', { timeout: 30000 })
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#not-found-message', { timeout: 10000 })
    expect(await page.textContent('#not-found-message')).toBe('deep not found')

    // the layout wraps the 404 page so its nav links are still rendered
    await page.waitForSelector('#nav-valid-item', { timeout: 5000 })

    // click the layout link to navigate to a valid page
    await page.click('#nav-valid-item')
    await page.waitForURL(`${serverUrl}/not-found/deep/valid-item`, { timeout: 10000 })
    await page.waitForSelector('#deep-title', { timeout: 10000 })

    // valid page should render with loader data
    expect(await page.textContent('#deep-title')).toBe('Deep: valid-item')
    expect(await page.textContent('#deep-content')).toBe('content for valid-item')

    // no crashes at any point
    const hasCrash = errors.some(
      (e) => e.includes('Cannot destructure') || e.includes('Cannot read properties of')
    )
    expect(hasCrash).toBe(false)

    await page.close()
  })
})
