import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
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

describe('Protected Routes', { retry: 1 }, () => {
  it('should render the public page', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/protected-test`)

    const publicPage = await page.getByTestId('public-page').textContent()
    expect(publicPage).toContain('Public Page')
  })

  it('should show auth status as false initially', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/protected-test`)

    const authStatus = await page.getByTestId('auth-status').textContent()
    expect(authStatus).toContain('Auth: false')
  })

  it('should not navigate to protected route when not authed', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/protected-test`)

    // Try to click the dashboard link
    await page.getByTestId('link-dashboard').click()

    // Wait a moment
    await page.waitForTimeout(500)

    // Should still be on public page (protected route doesn't exist)
    const publicPage = await page.getByTestId('public-page').textContent()
    expect(publicPage).toContain('Public Page')
    expect(page.url()).not.toContain('/dashboard')
  })

  it('should navigate to protected route after auth toggle', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/protected-test`)

    // Wait for hydration
    await page.waitForTimeout(1000)

    // Toggle auth using testID selector - more reliable in CI
    await page.getByTestId('toggle-auth').click()

    // Wait for state update
    await page.waitForTimeout(500)

    const authStatus = await page.getByTestId('auth-status').textContent()
    expect(authStatus).toContain('Auth: true')

    // Now navigate to dashboard
    await page.getByTestId('link-dashboard').click()

    // Wait for navigation
    await page.waitForTimeout(500)

    // Should be on dashboard
    const dashboardPage = await page.getByTestId('dashboard-page').textContent()
    expect(dashboardPage).toContain('Dashboard Page')
    expect(page.url()).toContain('/dashboard')
  })

  it('should hide protected routes when auth is toggled off', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/protected-test`)

    // Wait for hydration
    await page.waitForTimeout(1000)

    // Toggle auth on
    await page.getByTestId('toggle-auth').click()
    await page.waitForTimeout(500)

    let authStatus = await page.getByTestId('auth-status').textContent()
    expect(authStatus).toContain('Auth: true')

    // Navigate to dashboard
    await page.getByTestId('link-dashboard').click()
    await page.waitForTimeout(500)

    const dashboardPage = await page.getByTestId('dashboard-page').textContent()
    expect(dashboardPage).toContain('Dashboard Page')

    // Toggle auth off
    await page.getByTestId('toggle-auth').click()
    await page.waitForTimeout(500)

    authStatus = await page.getByTestId('auth-status').textContent()
    expect(authStatus).toContain('Auth: false')

    // Should be redirected back to public page (route filtered out)
    await page.waitForTimeout(500)
    const publicPage = await page.getByTestId('public-page').textContent()
    expect(publicPage).toContain('Public Page')
  })
})
