import { by, device, element, expect, waitFor } from 'detox'

describe('Loader Redirects', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('should show redirect test index', async () => {
    // navigate to redirect test section
    await element(by.id('go-to-redirect-test')).tap()

    await waitFor(element(by.id('redirect-test-title')))
      .toBeVisible()
      .withTimeout(5000)

    await expect(element(by.id('redirect-test-title'))).toHaveText('Redirect Test')
  })

  it('should redirect when navigating to protected route via Link', async () => {
    await element(by.id('go-to-redirect-test')).tap()

    await waitFor(element(by.id('go-to-protected')))
      .toBeVisible()
      .withTimeout(5000)

    // tap the link to the protected route
    await element(by.id('go-to-protected')).tap()

    // should be redirected to login page, not see protected content
    await waitFor(element(by.id('login-title')))
      .toBeVisible()
      .withTimeout(10000)

    await expect(element(by.id('login-message'))).toHaveText('You were redirected here')
  })

  it('should not show protected page content after redirect', async () => {
    await element(by.id('go-to-redirect-test')).tap()

    await waitFor(element(by.id('go-to-protected')))
      .toBeVisible()
      .withTimeout(5000)

    await element(by.id('go-to-protected')).tap()

    await waitFor(element(by.id('login-title')))
      .toBeVisible()
      .withTimeout(10000)

    // protected content should NOT be visible
    await expect(element(by.id('protected-title'))).not.toBeVisible()
    await expect(element(by.id('protected-secret'))).not.toBeVisible()
  })

  it('should redirect when navigating via router.push', async () => {
    await element(by.id('go-to-redirect-test')).tap()

    await waitFor(element(by.id('go-to-protected-push')))
      .toBeVisible()
      .withTimeout(5000)

    // use programmatic navigation
    await element(by.id('go-to-protected-push')).tap()

    // should still redirect to login
    await waitFor(element(by.id('login-title')))
      .toBeVisible()
      .withTimeout(10000)

    await expect(element(by.id('login-message'))).toHaveText('You were redirected here')
  })

  it('should handle return redirect() (not just throw)', async () => {
    await element(by.id('go-to-redirect-test')).tap()

    await waitFor(element(by.id('go-to-always-redirect')))
      .toBeVisible()
      .withTimeout(5000)

    // this route uses return redirect() instead of throw redirect()
    await element(by.id('go-to-always-redirect')).tap()

    // should redirect back to the redirect test index
    await waitFor(element(by.id('redirect-test-title')))
      .toBeVisible()
      .withTimeout(10000)

    // the "should not see this" content should not be visible
    await expect(element(by.id('always-redirect-title'))).not.toBeVisible()
  })

  it('should allow navigating back after redirect', async () => {
    await element(by.id('go-to-redirect-test')).tap()

    await waitFor(element(by.id('go-to-protected')))
      .toBeVisible()
      .withTimeout(5000)

    await element(by.id('go-to-protected')).tap()

    // wait for redirect to login
    await waitFor(element(by.id('login-title')))
      .toBeVisible()
      .withTimeout(10000)

    // go back to redirect test index
    await element(by.id('back-to-redirect-test')).tap()

    await waitFor(element(by.id('redirect-test-title')))
      .toBeVisible()
      .withTimeout(5000)

    await expect(element(by.id('redirect-test-title'))).toHaveText('Redirect Test')
  })
})
