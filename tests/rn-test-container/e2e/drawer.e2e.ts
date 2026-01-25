import { by, device, element, expect, waitFor } from 'detox'

describe('Drawer Navigation', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true })
  })

  beforeEach(async () => {
    await device.reloadReactNative()
  })

  it('should show the home screen initially', async () => {
    await expect(element(by.id('hello-word'))).toBeVisible()
  })

  it('should navigate to drawer demo', async () => {
    // tap the button to go to drawer demo
    await element(by.id('go-to-drawer')).tap()

    // wait for home screen inside drawer to appear
    await waitFor(element(by.id('home-title')))
      .toBeVisible()
      .withTimeout(5000)

    await expect(element(by.id('home-title'))).toHaveText('Home Screen')
  })

  it('should open drawer when button is pressed', async () => {
    // navigate to drawer demo first
    await element(by.id('go-to-drawer')).tap()

    await waitFor(element(by.id('open-drawer-button')))
      .toBeVisible()
      .withTimeout(5000)

    // tap to open drawer
    await element(by.id('open-drawer-button')).tap()

    // wait a bit for drawer animation
    await new Promise((resolve) => setTimeout(resolve, 500))

    // the drawer should be visible - check for drawer items
    // drawer items typically have text like "home" and "settings"
    await waitFor(element(by.text('home')))
      .toBeVisible()
      .withTimeout(3000)
  })

  it('should navigate between drawer screens', async () => {
    // navigate to drawer demo
    await element(by.id('go-to-drawer')).tap()

    await waitFor(element(by.id('open-drawer-button')))
      .toBeVisible()
      .withTimeout(5000)

    // open drawer
    await element(by.id('open-drawer-button')).tap()
    await new Promise((resolve) => setTimeout(resolve, 500))

    // tap on settings in the drawer
    await waitFor(element(by.text('settings')))
      .toBeVisible()
      .withTimeout(3000)

    await element(by.text('settings')).tap()

    // verify we're on settings screen
    await waitFor(element(by.id('settings-title')))
      .toBeVisible()
      .withTimeout(5000)

    await expect(element(by.id('settings-title'))).toHaveText('Settings Screen')
  })

  it('should toggle drawer from settings screen', async () => {
    // navigate to drawer demo
    await element(by.id('go-to-drawer')).tap()

    await waitFor(element(by.id('open-drawer-button')))
      .toBeVisible()
      .withTimeout(5000)

    // open drawer and go to settings
    await element(by.id('open-drawer-button')).tap()
    await new Promise((resolve) => setTimeout(resolve, 500))
    await element(by.text('settings')).tap()

    await waitFor(element(by.id('toggle-drawer-button')))
      .toBeVisible()
      .withTimeout(5000)

    // toggle drawer from settings
    await element(by.id('toggle-drawer-button')).tap()

    // drawer should be open - check for drawer items
    await waitFor(element(by.text('home')))
      .toBeVisible()
      .withTimeout(3000)

    // toggle again to close
    await element(by.id('toggle-drawer-button')).tap()

    // after closing, settings screen should be visible again
    await waitFor(element(by.id('settings-title')))
      .toBeVisible()
      .withTimeout(3000)
  })

  it('should support swipe to open drawer', async () => {
    // navigate to drawer demo
    await element(by.id('go-to-drawer')).tap()

    await waitFor(element(by.id('home-title')))
      .toBeVisible()
      .withTimeout(5000)

    // swipe from left edge to open drawer
    await element(by.id('home-title')).swipe('right', 'slow', 0.9, 0.01)

    // drawer should be visible
    await waitFor(element(by.text('home')))
      .toBeVisible()
      .withTimeout(3000)
  })
})
