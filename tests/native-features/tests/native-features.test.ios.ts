import { execFileSync } from 'node:child_process'
import { runZoomWithAppium } from '../scripts/one-native-zoom-appium'
import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, navigateTo } from '@vxrn/test/utils/appium'
import sharp from 'sharp'
import { captureScreenshot, waitForElement } from '../utils/screenshot'
import type { Browser } from 'webdriverio'

const sharedTestOptions = { timeout: 10 * 60 * 1000 }

async function dismissExpectedRenderError(driver: Browser, expectedMessage: string) {
  // react native also reports caught boundary errors in its development inspector.
  // verify that error before dismissing it so unrelated failures remain failures.
  const inspector = await waitForElement(driver, 'Render Error', { timeout: 30_000 })
  const message = driver.$(
    '-ios predicate string:type == "XCUIElementTypeStaticText" AND label BEGINSWITH ' +
      JSON.stringify(expectedMessage)
  )
  await message.waitForDisplayed({ timeout: 30_000 })
  expect(await message.getText()).toContain(expectedMessage)
  await (await waitForElement(driver, 'Dismiss')).click()
  await inspector.waitForDisplayed({ reverse: true, timeout: 30_000 })
}

function getSimulatorUdid(driver: Browser) {
  const capabilities = driver.capabilities as Record<string, any>
  return (
    capabilities?.udid ||
    capabilities?.['appium:udid'] ||
    capabilities?.['appium:options']?.udid ||
    process.env.SIMULATOR_UDID ||
    'booted'
  )
}

function openSimulatorUrl(driver: Browser, url: string) {
  execFileSync('xcrun', ['simctl', 'openurl', getSimulatorUdid(driver), url], {
    stdio: 'inherit',
  })
}

async function acceptOpenUrlPrompt(driver: Browser) {
  try {
    await driver.acceptAlert()
    return
  } catch {}

  const openButton = driver.$('~Open')
  try {
    await openButton.waitForDisplayed({ timeout: 3000 })
    await openButton.click()
  } catch {}
}

describe('one native integration tests', () => {
  let driver: Browser

  beforeAll(
    async () => {
      driver = await createSession(getWebDriverConfig())
      // wait for the app to boot and render the home screen
      await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
      await captureScreenshot(driver, 'home-screen-loaded')
    },
    5 * 60 * 1000
  )

  afterAll(async () => {
    if (driver) {
      try {
        await driver.deleteSession()
      } catch {}
    }
  })

  describe('ContactsUI contact viewer', () => {
    test('presents a native new contact and receives cancellation without saving', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-contact-ui')
      await waitForElement(driver, 'contact-ui-screen')
      expect(await (await waitForElement(driver, 'contact-ui-draft')).getText()).toBe('Draft: UIKit Fixture')
      await (await waitForElement(driver, 'contact-ui-new')).click()
      await waitForElement(driver, 'New Contact')
      await captureScreenshot(driver, 'contact-ui-native-new')
      await (await waitForElement(driver, 'Cancel')).click()
      await (await waitForElement(driver, 'Discard Changes')).click()
      await waitForElement(driver, 'Result: cancelled')
      expect(await (await waitForElement(driver, 'contact-ui-error')).getText()).toBe('Error: -')
      await (await waitForElement(driver, 'contact-ui-known')).click()
      await waitForElement(driver, 'Result: rejected')
      expect(await (await waitForElement(driver, 'contact-ui-error')).getText()).toBe('Error: Error: Save a contact first')
    })
  })

  describe('VisionKit data scanner', () => {
    test('rejects simulator presentation and scanning without recognized items', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-data-scanner')
      await waitForElement(driver, 'data-scanner-screen')
      expect(await (await waitForElement(driver, 'data-scanner-supported')).getText()).toBe('Supported: false')
      expect(await (await waitForElement(driver, 'data-scanner-available')).getText()).toBe('Available: true')
      await (await waitForElement(driver, 'data-scanner-present')).click()
      await waitForElement(driver, 'Error: E_DATA_SCANNER_UNSUPPORTED')
      expect(await (await waitForElement(driver, 'data-scanner-state')).getText()).toBe('State: rejected')
      await (await waitForElement(driver, 'data-scanner-dismiss')).click()
      await waitForElement(driver, 'State: dismissed')
      await (await waitForElement(driver, 'data-scanner-start')).click()
      await waitForElement(driver, 'State: rejected')
      expect(await (await waitForElement(driver, 'data-scanner-items')).getText()).toBe('Items: 0')
      await captureScreenshot(driver, 'data-scanner-unavailable')
    })
  })

  describe('MessageUI composers', () => {
    test('reports simulator capabilities and rejects unavailable composers', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-message-ui')
      await waitForElement(driver, 'message-ui-screen')
      expect(await (await waitForElement(driver, 'message-ui-mail-supported')).getText()).toBe('Mail: false')
      expect(await (await waitForElement(driver, 'message-ui-text-supported')).getText()).toBe('Text: false')
      await (await waitForElement(driver, 'message-ui-mail')).click()
      await waitForElement(driver, 'Error: E_MAIL_COMPOSE_UNAVAILABLE')
      expect(await (await waitForElement(driver, 'message-ui-result')).getText()).toBe('Result: rejected')
      await (await waitForElement(driver, 'message-ui-text')).click()
      await waitForElement(driver, 'Error: E_MESSAGE_COMPOSE_UNAVAILABLE')
      expect(await (await waitForElement(driver, 'message-ui-result')).getText()).toBe('Result: rejected')
      await captureScreenshot(driver, 'message-ui-unavailable')
    })
  })

  describe('VisionKit document camera', () => {
    test('reports actual simulator unavailability and rejects without pages', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-document-camera')
      await waitForElement(driver, 'document-camera-screen')
      expect(await (await waitForElement(driver, 'document-camera-supported')).getText()).toBe('Supported: false')
      await (await waitForElement(driver, 'document-camera-present')).click()
      await waitForElement(driver, 'State: rejected')
      expect(await (await waitForElement(driver, 'document-camera-error')).getText()).toBe('Error: E_DOCUMENT_CAMERA_UNSUPPORTED')
      expect(await (await waitForElement(driver, 'document-camera-pages')).getText()).toBe('Pages: 0')
      await captureScreenshot(driver, 'document-camera-unavailable')
    })
  })

  describe('CameraView capture', () => {
    test('rejects a picture without a running camera and keeps zoom and torch inert', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-camera')
      const state = await waitForElement(driver, 'one-native-camera-state')
      const picture = await waitForElement(driver, 'one-native-camera-picture')
      const zoom = await waitForElement(driver, 'one-native-camera-zoom')
      await driver.waitUntil(async () => (await state.getText()) === 'Camera state: inactive')
      await (await waitForElement(driver, 'one-native-camera-take-picture')).click()
      await driver.waitUntil(
        async () => (await picture.getText()) === 'Camera picture: error:E_CAMERA_NOT_READY'
      )
      await (await waitForElement(driver, 'one-native-camera-zoom-torch')).click()
      await driver.waitUntil(async () => (await zoom.getText()) === 'Camera zoom: 0.5 torch: true')
      expect(await state.getText()).toBe('Camera state: inactive')
      await captureScreenshot(driver, 'camera-capture-not-ready')
    })
  })

  // -- home screen --

  describe('Home Screen', () => {
    test('renders home screen with navigation links', sharedTestOptions, async () => {
      await navigateTo(driver, '/')
      await waitForElement(driver, 'home-screen')
      const title = await waitForElement(driver, 'home-title')
      expect(await title.getText()).toBe('One Native Test Suite')

      // verify all nav links exist
      const navLinks = [
        'nav-color-test',
        'nav-zoom-test',
        'nav-toolbar-test',
        'nav-menu-test',
        'nav-split-view-test',
      ]

      for (const linkId of navLinks) {
        const link = driver.$(`~${linkId}`)
        await link.waitForDisplayed({ timeout: 5000 })
        expect(await link.isDisplayed()).toBe(true)
      }

      await captureScreenshot(driver, 'home-screen-nav-links')
    })
  })

  // -- deep linking --

  describe('Deep Linking', () => {
    test(
      'opens a configured custom scheme URL in the iOS simulator',
      sharedTestOptions,
      async () => {
        await navigateTo(driver, '/')
        await waitForElement(driver, 'home-screen', { timeout: 30_000 })

        openSimulatorUrl(driver, 'nativefeatures://app/deep-link/123')
        await acceptOpenUrlPrompt(driver)

        await waitForElement(driver, 'deep-link-screen', { timeout: 30_000 })

        const title = await waitForElement(driver, 'deep-link-title')
        expect(await title.getText()).toBe('Deep Link Test')

        const id = await waitForElement(driver, 'deep-link-id')
        expect(await id.getText()).toBe('ID: 123')

        const path = await waitForElement(driver, 'deep-link-path')
        expect(await path.getText()).toBe('Path: /deep-link/123')

        await captureScreenshot(driver, 'deep-link-custom-scheme')
      }
    )
  })

  describe('Notification categories', () => {
    test('round-trips options and text actions, and replaces one category', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-notifications')
      await (await waitForElement(driver, 'one-native-notifications-category-roundtrip')).click()
      const result = await waitForElement(driver, 'one-native-notifications-category-roundtrip-result')
      await result.waitUntil(async () => (await result.getText()) !== 'Category round trip: ready', {
        timeout: 5000,
        timeoutMsg: 'notification category round trip did not finish',
      })
      expect(await result.getText()).toBe('Category round trip: passed')
      await captureScreenshot(driver, 'one-native-notifications-category-roundtrip')
    })
  })

  // -- native source --

  describe('Native Source', () => {
    test(
      'imports Swift source and round-trips struct, enum, date and data payloads',
      sharedTestOptions,
      async () => {
        await navigateTo(driver, '/one-native-source')

        // the module is mounted and callable
        const run = await waitForElement(driver, 'native-source-run', { timeout: 30_000 })
        expect(await run.isDisplayed()).toBe(true)
        await run.click()
        const result = await waitForElement(driver, 'native-source-result', { timeout: 30_000 })
        await driver.waitUntil(async () => (await result.getText()) !== 'ready', { timeout: 30_000 })
        expect(await result.getText()).toContain('swift')

        // struct, enum, date and data payloads cross with their types revived
        const runPayloads = await waitForElement(driver, 'native-payloads-run', { timeout: 30_000 })
        await runPayloads.click()
        const payloads = await waitForElement(driver, 'native-payloads-result', { timeout: 30_000 })
        await driver.waitUntil(async () => (await payloads.getText()) !== 'ready', { timeout: 30_000 })
        const payloadText = await payloads.getText()
        expect(payloadText).toContain('"x":1')
        expect(payloadText).toContain('"label":null')
        expect(JSON.parse(payloadText).labeled).toEqual({ x: 3, y: 4, label: 'Named waypoint' })
        expect(payloadText).toContain('"heading":"north"')
        expect(payloadText).toContain('"at":"2026-01-01T00:00:00.000Z"')
        expect(payloadText).toContain('"blob":[1,2,3]')

        // a mistyped payload throws before the call leaves JavaScript
        const runInvalid = await waitForElement(driver, 'native-payloads-invalid-run', {
          timeout: 30_000,
        })
        await runInvalid.click()
        const invalid = await waitForElement(driver, 'native-payloads-invalid-result', {
          timeout: 30_000,
        })
        await driver.waitUntil(async () => (await invalid.getText()) !== 'ready', { timeout: 30_000 })
        expect(await invalid.getText()).toContain('expected Date')

        // a native event subscription receives the tick, then unsubscribes
        const runEvents = await waitForElement(driver, 'native-events-run', { timeout: 30_000 })
        await runEvents.click()
        const events = await waitForElement(driver, 'native-events-result', { timeout: 30_000 })
        await driver.waitUntil(async () => (await events.getText()) !== 'ready', { timeout: 30_000 })
        expect(await events.getText()).toContain('"ticks":[1]')

        // a non-function listener throws before subscribing
        const runEventsInvalid = await waitForElement(driver, 'native-events-invalid-run', {
          timeout: 30_000,
        })
        await runEventsInvalid.click()
        const eventsInvalid = await waitForElement(driver, 'native-events-invalid-result', {
          timeout: 30_000,
        })
        await driver.waitUntil(async () => (await eventsInvalid.getText()) !== 'ready', { timeout: 30_000 })
        expect(await eventsInvalid.getText()).toContain('needs a listener function')

        await captureScreenshot(driver, 'native-source-payloads')
      }
    )
  })

  // -- color api --

  describe('Color API', () => {
    test('renders iOS system colors', sharedTestOptions, async () => {
      await navigateTo(driver, '/color-test')
      await waitForElement(driver, 'color-test-screen', { timeout: 30_000 })

      const title = await waitForElement(driver, 'color-test-title')
      expect(await title.getText()).toBe('Color API Test')

      // verify system color boxes are rendered
      const systemColors = [
        'systemBlue',
        'systemRed',
        'systemGreen',
        'systemOrange',
        'systemPurple',
        'systemPink',
        'systemYellow',
        'systemTeal',
        'systemIndigo',
        'systemCyan',
        'systemMint',
        'systemBrown',
      ]

      for (const colorName of systemColors) {
        const box = driver.$(`~color-box-${colorName}`)
        await box.waitForDisplayed({ timeout: 5000 })
        expect(await box.isDisplayed()).toBe(true)

        const label = driver.$(`~color-label-${colorName}`)
        expect(await label.getText()).toBe(colorName)
      }

      await captureScreenshot(driver, 'color-api-ios-system-colors')
    })

    test('renders iOS gray scale colors', sharedTestOptions, async () => {
      // should still be on color-test from previous test
      const grayColors = [
        'systemGray',
        'systemGray2',
        'systemGray3',
        'systemGray4',
        'systemGray5',
        'systemGray6',
      ]

      for (const colorName of grayColors) {
        const box = driver.$(`~color-box-${colorName}`)
        await box.waitForDisplayed({ timeout: 5000 })
        expect(await box.isDisplayed()).toBe(true)
      }

      await captureScreenshot(driver, 'color-api-ios-gray-scale')
    })

    test('renders iOS semantic colors', sharedTestOptions, async () => {
      const semanticColors = [
        'label',
        'secondaryLabel',
        'tertiaryLabel',
        'systemFill',
        'separator',
        'link',
      ]

      for (const colorName of semanticColors) {
        const box = driver.$(`~color-box-${colorName}`)
        await box.waitForDisplayed({ timeout: 5000 })
        expect(await box.isDisplayed()).toBe(true)
      }

      await captureScreenshot(driver, 'color-api-ios-semantic-colors')
    })

    test('renders iOS background colors', sharedTestOptions, async () => {
      const bgColors = [
        'systemBackground',
        'secondarySystemBackground',
        'tertiarySystemBackground',
      ]

      for (const colorName of bgColors) {
        const box = driver.$(`~color-box-${colorName}`)
        // may need to scroll to see these
        try {
          await box.waitForDisplayed({ timeout: 3000 })
        } catch {
          // scroll down to find it
          await driver.execute('mobile: scroll', { direction: 'down' })
          await box.waitForDisplayed({ timeout: 5000 })
        }
        expect(await box.isDisplayed()).toBe(true)
      }

      // verify the complete render status (at bottom of scroll view)
      const statusEl = driver.$('~color-render-complete')
      for (let i = 0; i < 5; i++) {
        try {
          await statusEl.waitForDisplayed({ timeout: 3000 })
          break
        } catch {
          await driver.execute('mobile: scroll', { direction: 'down' })
        }
      }
      expect(await statusEl.getText()).toBe('Color render complete')

      await captureScreenshot(driver, 'color-api-ios-background-colors')
    })
  })

  // -- toolbar --

  describe('Toolbar', () => {
    test(
      'toolbar screen renders with all items described',
      sharedTestOptions,
      async () => {
        await navigateTo(driver, '/toolbar-test')
        const title = await waitForElement(driver, 'toolbar-test-title', {
          timeout: 30_000,
        })
        expect(await title.getText()).toBe('Toolbar Test')

        // verify the status card shows initial state
        const lastAction = await waitForElement(driver, 'toolbar-last-action')
        expect(await lastAction.getText()).toBe('none')

        const actionCount = await waitForElement(driver, 'toolbar-action-count')
        expect(await actionCount.getText()).toBe('0')

        await captureScreenshot(driver, 'toolbar-initial-state')
      }
    )

    test('toolbar item descriptions are visible', sharedTestOptions, async () => {
      const items = [
        'toolbar-item-desc-add',
        'toolbar-item-desc-search',
        'toolbar-item-desc-spacer',
        'toolbar-item-desc-share',
        'toolbar-item-desc-settings',
        'toolbar-item-desc-disabled',
      ]

      for (const itemId of items) {
        const item = driver.$(`~${itemId}`)
        try {
          await item.waitForDisplayed({ timeout: 3000 })
        } catch {
          await driver.execute('mobile: scroll', { direction: 'down' })
          await item.waitForDisplayed({ timeout: 5000 })
        }
        expect(await item.isDisplayed()).toBe(true)
      }

      const status = await waitForElement(driver, 'toolbar-render-complete')
      expect(await status.getText()).toBe('Toolbar test rendered')

      await captureScreenshot(driver, 'toolbar-with-items')
    })

    test('bottom toolbar button invokes its page action', sharedTestOptions, async () => {
      const addButton = await waitForElement(driver, 'Add')
      await addButton.click()

      const lastAction = await waitForElement(driver, 'toolbar-last-action')
      expect(await lastAction.getText()).toBe('add')

      const actionCount = await waitForElement(driver, 'toolbar-action-count')
      expect(await actionCount.getText()).toBe('1')
    })
  })

  // -- bars action bar (track A): WRITTEN, interaction legs not RAN (static screenshots proven on iOS 27 sim) --

  describe('Bars Action Bar', () => {
    test(
      'action bar renders clustered toolbar with status',
      sharedTestOptions,
      async () => {
        await navigateTo(driver, '/bars-action-bar')
        const title = await waitForElement(driver, 'bars-action-title', {
          timeout: 30_000,
        })
        expect(await title.getText()).toBe('Action Bar')

        const lastAction = await waitForElement(driver, 'bars-action-last-action')
        expect(await lastAction.getText()).toBe('none')

        await captureScreenshot(driver, 'bars-action-initial')
      }
    )

    test('each cluster button reports its onPress', sharedTestOptions, async () => {
      const buttons: [string, string][] = [
        ['Save item', 'save'],
        ['Tag item', 'tag'],
        ['Share item', 'share'],
      ]
      for (const [label, action] of buttons) {
        const button = await waitForElement(driver, label)
        await button.click()
        const lastAction = await waitForElement(driver, 'bars-action-last-action')
        expect(await lastAction.getText()).toBe(action)
      }

      const actionCount = await waitForElement(driver, 'bars-action-count')
      expect(await actionCount.getText()).toBe('3')

      await captureScreenshot(driver, 'bars-action-pressed')
    })

    test('spacer toggle collapses the clusters', sharedTestOptions, async () => {
      const toggle = await waitForElement(driver, 'bars-action-spacer-toggle')
      await toggle.click()

      const state = await waitForElement(driver, 'bars-action-spacer-state')
      expect(await state.getText()).toBe('spacer-off')

      await captureScreenshot(driver, 'bars-action-no-spacer')
    })
  })

  // -- bars double bar (track B) --

  describe('Bars Double Bar', () => {
    test(
      'accessory renders above the tab bar with regular placement',
      sharedTestOptions,
      async () => {
        await navigateTo(driver, '/bars-double-bar')
        const title = await waitForElement(driver, 'bars-double-title', {
          timeout: 30_000,
        })
        expect(await title.getText()).toBe('Double Bar')

        const placement = await waitForElement(
          driver,
          'bars-double-accessory-placement-regular'
        )
        expect(await placement.getText()).toBe('regular')

        await captureScreenshot(driver, 'bars-double-rest')
      }
    )

    test(
      'tab bar minimizes on scroll with inline accessory',
      sharedTestOptions,
      async () => {
        // one page down: uikit expands a minimized tab bar again once the scroll
        // reaches the end of its content, the same in a plain uikit tab controller.
        await driver.execute('mobile: scroll', { direction: 'down' })

        const placement = await waitForElement(
          driver,
          'bars-double-accessory-placement-inline',
          { timeout: 10_000 }
        )
        expect(await placement.getText()).toBe('inline')

        await captureScreenshot(driver, 'bars-double-minimized')

        await driver.execute('mobile: scroll', { direction: 'up' })
      }
    )
  })

  // -- bars button probe (track C) --

  describe('Bars Button Probe', () => {
    test('probe toolbar item sits in the tab bar row', sharedTestOptions, async () => {
      await navigateTo(driver, '/bars-probe/main')
      const title = await waitForElement(driver, 'bars-probe-title', {
        timeout: 30_000,
      })
      expect(await title.getText()).toBe('Button Probe')

      // uikit hosts a tab-embedded navigation toolbar item beside the floating tab
      // bar, and xctest reports that item not visible even in a plain uikit tab
      // controller, so this asserts its placement in the tab bar row and taps it.
      const action = driver.$('~Probe action')
      await action.waitForExist({ timeout: 30_000 })
      const actionRect = await driver.getElementRect(await action.elementId)
      const tabBarRect = await driver.getElementRect(
        await driver.$('//XCUIElementTypeTabBar').elementId
      )
      expect(actionRect.y).toBeGreaterThanOrEqual(tabBarRect.y)
      expect(actionRect.y + actionRect.height).toBeLessThanOrEqual(
        tabBarRect.y + tabBarRect.height
      )
      await action.click()

      const lastAction = await waitForElement(driver, 'bars-probe-last-action')
      expect(await lastAction.getText()).toBe('probe')

      await captureScreenshot(driver, 'bars-probe-in-tab')
    })

    test('probe spacer toggle and control route', sharedTestOptions, async () => {
      const toggle = await waitForElement(driver, 'bars-probe-spacer-toggle')
      await toggle.click()

      const state = await waitForElement(driver, 'bars-probe-spacer-state')
      expect(await state.getText()).toBe('spacer-off')

      await captureScreenshot(driver, 'bars-probe-no-spacer')

      await navigateTo(driver, '/bars-probe-control')
      const controlTitle = await waitForElement(driver, 'bars-probe-control-title', {
        timeout: 30_000,
      })
      expect(await controlTitle.getText()).toBe('Probe Control')

      await captureScreenshot(driver, 'bars-probe-control')
    })
  })

  // -- menu actions --

  describe('Menu Actions', () => {
    test('menu action screen renders', sharedTestOptions, async () => {
      await navigateTo(driver, '/menu-test')
      await waitForElement(driver, 'menu-test-screen', { timeout: 30_000 })

      const title = await waitForElement(driver, 'menu-test-title')
      expect(await title.getText()).toBe('Menu Action Test')

      // verify initial state
      const lastAction = await waitForElement(driver, 'menu-last-action')
      expect(await lastAction.getText()).toBe('none')

      await captureScreenshot(driver, 'menu-actions-initial')
    })

    test('menu action items are rendered', sharedTestOptions, async () => {
      const actionWrappers = [
        'menu-action-edit-wrapper',
        'menu-action-delete-wrapper',
        'menu-action-disabled-wrapper',
        'menu-action-share-wrapper',
        'menu-action-toggle-wrapper',
        'menu-action-hidden-wrapper',
      ]

      for (const wrapperId of actionWrappers) {
        const wrapper = driver.$(`~${wrapperId}`)
        try {
          await wrapper.waitForDisplayed({ timeout: 3000 })
        } catch {
          await driver.execute('mobile: scroll', { direction: 'down' })
          await wrapper.waitForDisplayed({ timeout: 5000 })
        }
        expect(await wrapper.isDisplayed()).toBe(true)
      }

      const status = await waitForElement(driver, 'menu-render-complete')
      expect(await status.getText()).toBe('Menu test rendered')

      await captureScreenshot(driver, 'menu-actions-all-rendered')
    })
  })

  // -- split view --

  describe('SplitView', () => {
    test('split view screen renders', sharedTestOptions, async () => {
      await navigateTo(driver, '/split-view-test')
      await waitForElement(driver, 'split-view-test-screen', { timeout: 30_000 })

      const title = await waitForElement(driver, 'split-view-title')
      expect(await title.getText()).toBe('One.iOS.SplitView Test')

      await captureScreenshot(driver, 'split-view-initial')
    })

    test('split view shows sidebar items', sharedTestOptions, async () => {
      // the phone starts on the collapsed detail column; use UIKit's back action.
      await (await waitForElement(driver, 'BackButton')).click()
      const sidebarItems = ['inbox', 'sent', 'drafts', 'archive', 'trash']

      for (const itemId of sidebarItems) {
        const item = driver.$(`~split-sidebar-item-${itemId}`)
        try {
          await item.waitForDisplayed({ timeout: 3000 })
        } catch {
          await driver.execute('mobile: scroll', { direction: 'down' })
          await item.waitForDisplayed({ timeout: 5000 })
        }
        expect(await item.isDisplayed()).toBe(true)
      }

      await captureScreenshot(driver, 'split-view-sidebar-items')
    })

    test('split view renders completion status', sharedTestOptions, async () => {
      const status = await waitForElement(driver, 'split-view-render-complete')
      expect(await status.getText()).toBe('One.iOS.SplitView test rendered')

      const selectedId = await waitForElement(driver, 'split-view-selected-id')
      expect(await selectedId.getText()).toContain('inbox')

      await captureScreenshot(driver, 'split-view-complete')
    })

    test('split view sidebar selection updates state', sharedTestOptions, async () => {
      // tap drafts
      const draftsItem = driver.$('~split-sidebar-item-drafts')
      try {
        await draftsItem.waitForDisplayed({ timeout: 3000 })
      } catch {
        await driver.execute('mobile: scroll', { direction: 'up' })
        await draftsItem.waitForDisplayed({ timeout: 5000 })
      }
      await draftsItem.click()

      const selectedId = await waitForElement(driver, 'split-view-selected-id')
      await selectedId.waitUntil(
        async () => (await selectedId.getText()).includes('drafts'),
        {
          timeout: 5000,
          timeoutMsg: 'split view did not select drafts',
        }
      )

      await captureScreenshot(driver, 'split-view-drafts-selected')
    })
  })

  // -- tab view parity --

  describe('One Native withAnimation', () => {
    test('an animated write completes and a plain write does not', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-animation')
      const status = await waitForElement(driver, 'one-native-animation-status', { timeout: 30_000 })
      expect(await status.getText()).toContain('Level: 0 · Completions: 0')

      await (await waitForElement(driver, 'one-native-animation-animate')).click()
      await status.waitUntil(async () => (await status.getText()).includes('Level: 100 · Completions: 1'), {
        timeout: 5000,
        timeoutMsg: 'withAnimation did not apply its write and run its completion',
      })
      await captureScreenshot(driver, 'one-native-animation-animated')

      // a write outside withAnimation moves the slider without a completion.
      await (await waitForElement(driver, 'one-native-animation-jump')).click()
      await status.waitUntil(async () => (await status.getText()).includes('Level: 0 · Completions: 1'), {
        timeout: 5000,
        timeoutMsg: 'the plain write did not apply',
      })

      await (await waitForElement(driver, 'one-native-animation-nested')).click()
      const error = await waitForElement(driver, 'one-native-animation-error')
      await error.waitUntil(async () => (await error.getText()).includes('inside another withAnimation body'), {
        timeout: 5000,
        timeoutMsg: 'a nested withAnimation did not throw',
      })
    })
  })

  describe('One Native derived SDK views', () => {
    test('derived views mount, act, and reject two constructors', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-derived-views')
      // the loaded AsyncImage is an unlabeled SwiftUI image, which accessibility
      // reports as not visible while it is on screen, so judge it by what it
      // drew: an image element laid out at the 64px logo's size at scale 2.
      // the placeholder is not an image and fills the proposed width.
      const image = driver.$('~one-native-derived-async-image')
      await driver.waitUntil(
        async () =>
          (await image.isExisting()) &&
          (await image.getTagName()) === 'XCUIElementTypeImage' &&
          JSON.stringify(await image.getSize()) === JSON.stringify({ width: 32, height: 32 }),
        { timeout: 30_000, timeoutMsg: 'AsyncImage did not draw its image at scale 2' }
      )
      for (const id of [
        'one-native-derived-location-button',
        'one-native-derived-shortcuts-link',
        'one-native-derived-product',
        'one-native-derived-store',
        'one-native-derived-rename-button',
        'one-native-derived-subscription-store',
        'one-native-derived-chart',
      ]) {
        const view = await waitForElement(driver, id, { timeout: 30_000 })
        expect(await view.isDisplayed(), id).toBe(true)
      }
      await captureScreenshot(driver, 'one-native-derived-views')

      await (await waitForElement(driver, 'one-native-derived-invalid')).click()
      await dismissExpectedRenderError(driver, 'SubscriptionStoreView takes exactly one of groupID, productIDs')
      await driver.execute('mobile: scroll', { direction: 'down' })
      const error = await waitForElement(driver, 'one-native-derived-error')
      expect(await error.getText()).toContain('takes exactly one of groupID, productIDs')
    })
  })

  async function enterFreshDerivedExample() {
    await navigateTo(driver, '/one-native-derived-behavior')
    const keyboard = driver.$('XCUIElementTypeKeyboard')
    if (await keyboard.isDisplayed()) await (await waitForElement(driver, 'Return')).click()
    await driver.waitUntil(async () => !(await keyboard.isDisplayed()), {
      timeout: 5000, timeoutMsg: 'navigation keyboard still covers derived controls',
    })
    await (await waitForElement(driver, 'derived-reset')).click()
    await driver.waitUntil(async () =>
      (await (await waitForElement(driver, 'derived-location-actions')).getText()) === 'Location actions: 0' &&
      (await (await waitForElement(driver, 'derived-shortcut-actions')).getText()) === 'Shortcuts actions: 0',
      { timeout: 5000, timeoutMsg: 'derived fixture did not reset its action counts' }
    )
  }

  describe('One Native AsyncImage behavior', () => {
    async function imageRedWidth() {
      const image = await waitForElement(driver, 'derived-image')
      const [{ x, y }, { width, height }, window] = await Promise.all([
        image.getLocation(),
        image.getSize(),
        driver.getWindowSize(),
      ])
      const { data, info } = await sharp(
        Buffer.from(await driver.takeScreenshot(), 'base64')
      )
        .raw()
        .toBuffer({ resolveWithObject: true })
      const scale = info.width / window.width
      const row = Math.round((y + height / 2) * scale)
      let red = 0
      for (
        let column = Math.round(x * scale);
        column < Math.round((x + width) * scale);
        column++
      ) {
        const offset = (row * info.width + column) * info.channels
        if (data[offset] > 220 && data[offset + 1] < 45 && data[offset + 2] < 55) red++
      }
      return red / scale
    }

    test(
      'matches SDK scale and nil URL behavior across view identities',
      sharedTestOptions,
      async () => {
        await enterFreshDerivedExample()
        await waitForElement(driver, 'derived-behavior-screen')
        expect(await imageRedWidth()).toBe(0)
        await (await waitForElement(driver, 'derived-image-load')).click()
        await driver.waitUntil(async () => (await imageRedWidth()) === 96, {
          timeout: 10_000,
          timeoutMsg: 'AsyncImage did not draw the 96-point image',
        })
        await captureScreenshot(driver, 'derived-async-image-loaded')
        await (await waitForElement(driver, 'derived-image-scale')).click()
        await driver.waitUntil(async () =>
          (await (await waitForElement(driver, 'derived-image-scale-value')).getText()) === 'Image scale: 2',
          { timeout: 5000, timeoutMsg: 'scale control did not update the fixture input' }
        )
        await (await waitForElement(driver, 'derived-checkpoint')).click()
        await driver.waitUntil(async () =>
          (await (await waitForElement(driver, 'derived-checkpoints')).getText()) === 'Checkpoints: 1',
          { timeout: 5000, timeoutMsg: 'the app did not process the action after changing scale' }
        )
        // the SDK retains its loaded image when only scale changes under the same identity.
        expect(await imageRedWidth()).toBe(96)
        await captureScreenshot(driver, 'derived-async-image-cached-scale')
        await (await waitForElement(driver, 'derived-image-recreate')).click()
        await driver.waitUntil(async () =>
          (await (await waitForElement(driver, 'derived-image-identity')).getText()) === 'Image identity: 1',
          { timeout: 5000, timeoutMsg: 'image identity control did not remount the view' }
        )
        await driver.waitUntil(async () => (await imageRedWidth()) === 48, {
          timeout: 10_000,
          timeoutMsg: 'AsyncImage scale 2 did not halve image width',
        })
        await captureScreenshot(driver, 'derived-async-image-scaled')
        await (await waitForElement(driver, 'derived-image-clear')).click()
        await driver.waitUntil(async () =>
          (await (await waitForElement(driver, 'derived-image-url')).getText()) === 'Image URL: nil',
          { timeout: 5000, timeoutMsg: 'clear control did not set the nil URL input' }
        )
        // the SDK retains its loaded image when the URL becomes nil under the same identity.
        expect(await imageRedWidth()).toBe(48)
        await (await waitForElement(driver, 'derived-image-recreate')).click()
        await driver.waitUntil(async () =>
          (await (await waitForElement(driver, 'derived-image-identity')).getText()) === 'Image identity: 2',
          { timeout: 5000, timeoutMsg: 'nil image identity control did not remount the view' }
        )
        await driver.waitUntil(async () => (await imageRedWidth()) === 0, {
          timeout: 10_000,
          timeoutMsg: 'AsyncImage nil URL did not draw its placeholder after recreation',
        })
        await captureScreenshot(driver, 'derived-async-image-nil')
      }
    )
  })

  describe('One Native ShortcutsLink behavior', () => {
    test(
      'opens Shortcuts and delivers its SDK action after returning to the app',
      sharedTestOptions,
      async () => {
        await enterFreshDerivedExample()
        await (await waitForElement(driver, 'derived-example-shortcuts')).click()
        expect(
          await (await waitForElement(driver, 'derived-shortcut-actions')).getText()
        ).toBe('Shortcuts actions: 0')
        expect(
          await (await waitForElement(driver, 'derived-location-actions')).getText()
        ).toBe('Location actions: 0')
        await (await waitForElement(driver, 'derived-shortcuts')).click()
        await driver.waitUntil(
          async () =>
            (await driver.execute('mobile: queryAppState', {
              bundleId: 'com.apple.shortcuts',
            })) === 4,
          {
            timeout: 10_000,
            timeoutMsg: 'ShortcutsLink did not foreground the Shortcuts app',
          }
        )
        await captureScreenshot(driver, 'derived-shortcuts-destination')
        await driver.execute('mobile: activateApp', { bundleId: 'dev.vxrn.native.tests' })
        const actions = await waitForElement(driver, 'derived-shortcut-actions')
        await actions.waitUntil(
          async () => (await actions.getText()) === 'Shortcuts actions: 1',
          {
            timeout: 10_000,
            timeoutMsg: 'ShortcutsLink did not deliver its SDK action',
          }
        )
        expect(
          await (await waitForElement(driver, 'derived-location-actions')).getText()
        ).toBe('Location actions: 0')
        await captureScreenshot(driver, 'derived-shortcuts-action')
      }
    )
  })

  describe('One Native TabView Parity', () => {
    test(
      'bottom accessory takes touches in expanded and inline modes',
      sharedTestOptions,
      async () => {
        await navigateTo(driver, '/one-native-tabview')
        const accessory = await waitForElement(driver, 'tabview-accessory', {
          timeout: 30_000,
        })
        expect(await accessory.isDisplayed()).toBe(true)

        await accessory.click()

        const events = await waitForElement(driver, 'tabview-events')
        await events.waitUntil(
          async () => (await events.getText()).includes('accessory'),
          {
            timeout: 5000,
            timeoutMsg: 'accessory press event was not received in expanded mode',
          }
        )
        expect(await events.getText()).toContain('accessory')

        const accBtn = await waitForElement(driver, 'test-acc-plain')
        await accBtn.click()
        await events.waitUntil(
          async () => (await events.getText()).includes('acc-plain'),
          {
            timeout: 5000,
            timeoutMsg: 'native accessory button press event was not received',
          }
        )
        expect(await events.getText()).toContain('acc-plain')

        await captureScreenshot(driver, 'tabview-accessory-expanded')

        // minimize tab bar on scroll to test inline mode
        for (let index = 0; index < 4; index++) {
          await driver.execute('mobile: scroll', { direction: 'down' })
        }

        const inlineAccessory = await waitForElement(driver, 'tabview-accessory', {
          timeout: 10_000,
        })
        await inlineAccessory.click()

        await events.waitUntil(
          async () => (await events.getText()).includes('accessory'),
          {
            timeout: 5000,
            timeoutMsg: 'accessory press event was not received in inline mode',
          }
        )
        expect(await events.getText()).toContain('accessory')

        await captureScreenshot(driver, 'tabview-accessory-inline')

        for (let index = 0; index < 4; index++) {
          await driver.execute('mobile: scroll', { direction: 'up' })
        }
      }
    )
  })

  describe('One Native EditButton accessibility', () => {
    test('each identifier selects its SwiftUI control once', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-edit-button')
      await waitForElement(driver, 'one-native-edit-button-standalone')
      const standalone = await driver.$$('~one-native-edit-button-standalone')
      expect(standalone.length).toBe(1)
      expect(await standalone[0].getAttribute('label')).toBe('Edit')
      const composed = await driver.$$('~one-native-edit-button-control')
      expect(composed.length).toBe(1)
      expect(await composed[0].getAttribute('label')).toBe('Edit')
      await captureScreenshot(driver, 'one-native-edit-button-accessibility')
    })
  })

  describe('One Native standalone Button', () => {
    test('a tap on each standalone button reports one press', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-button')
      const state = await waitForElement(driver, 'one-native-button-state', { timeout: 30_000 })
      expect(await state.getText()).toBe('button:idle count:0')

      await (await waitForElement(driver, 'one-native-button-automatic')).click()
      await state.waitUntil(async () => (await state.getText()) === 'button:automatic count:1', {
        timeout: 5000,
        timeoutMsg: 'standalone Button tap did not report onPress',
      })
      await (await waitForElement(driver, 'one-native-button-bordered')).click()
      await state.waitUntil(async () => (await state.getText()) === 'button:bordered count:2', {
        timeout: 5000,
        timeoutMsg: 'standalone bordered Button tap did not report onPress',
      })
      await (await waitForElement(driver, 'one-native-button-gesture-root')).click()
      await state.waitUntil(async () => (await state.getText()) === 'button:gesture-root count:3', {
        timeout: 5000,
        timeoutMsg: 'Button under a GestureHandlerRootView did not report onPress',
      })
      await captureScreenshot(driver, 'one-native-button-pressed')
    })
  })

  describe('One Native MultiDatePicker and PassKit buttons', () => {
    test('picker resets through revisions and buttons report taps', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-picker-passkit')
      const picker = await waitForElement(driver, 'one-native-picker-passkit-picker', { timeout: 30_000 })
      expect(await picker.isDisplayed()).toBe(true)

      const status = await waitForElement(driver, 'one-native-picker-passkit-status')
      expect(await status.getText()).toContain('Selected: 2')
      expect(await status.getText()).toContain('Observed: none')

      // a tap on each system button reports exactly one press. the calendar fills
      // the first screen, so scroll down to the buttons first.
      await driver.execute('mobile: scroll', { direction: 'down' })
      await driver.execute('mobile: scroll', { direction: 'down' })
      await (await waitForElement(driver, 'one-native-picker-passkit-pay')).click()
      const presses = await waitForElement(driver, 'one-native-picker-passkit-presses')
      await presses.waitUntil(
        async () => (await presses.getText()).includes('Pay presses: 1'),
        { timeout: 5000, timeoutMsg: 'PayWithApplePayButton tap did not report onPress' }
      )
      await (await waitForElement(driver, 'one-native-picker-passkit-wallet')).click()
      await presses.waitUntil(
        async () => (await presses.getText()).includes('Wallet presses: 1'),
        { timeout: 5000, timeoutMsg: 'AddPassToWalletButton tap did not report onPress' }
      )
      expect(await presses.getText()).toContain('Pay presses: 1 · Wallet presses: 1')
      await captureScreenshot(driver, 'one-native-picker-passkit-buttons')

      // an external reset clears the calendar without fabricating an observation.
      await (await waitForElement(driver, 'one-native-picker-passkit-clear')).click()
      await status.waitUntil(
        async () => (await status.getText()).includes('Selected: 0 · Observed: none'),
        { timeout: 5000, timeoutMsg: 'revision reset did not clear the picker' }
      )
      await (await waitForElement(driver, 'one-native-picker-passkit-pick')).click()
      await status.waitUntil(
        async () => (await status.getText()).includes('Selected: 2 · Observed: none'),
        { timeout: 5000, timeoutMsg: 'revision reset did not restore the picker' }
      )
      await captureScreenshot(driver, 'one-native-picker-passkit-calendar')
    })

    test('invalid picker selection and button label throw', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-picker-passkit')
      await waitForElement(driver, 'one-native-picker-passkit-picker', { timeout: 30_000 })
      // the calendar fills the first screen; the controls sit below it.
      await driver.execute('mobile: scroll', { direction: 'down' })
      await (await waitForElement(driver, 'one-native-picker-passkit-invalid')).click()
      await dismissExpectedRenderError(driver, 'MultiDatePicker selection must be an array of valid Dates')
      await driver.execute('mobile: scroll', { direction: 'down' })
      const pickerError = await waitForElement(driver, 'one-native-picker-passkit-error')
      expect(await pickerError.getText()).toContain('must be an array of valid Dates')

      await driver.execute('mobile: scroll', { direction: 'down' })
      await driver.execute('mobile: scroll', { direction: 'down' })
      await (await waitForElement(driver, 'one-native-picker-passkit-bad-label')).click()
      await dismissExpectedRenderError(driver, 'Unknown SwiftUI PayWithApplePayButtonLabel: shout')
      await driver.execute('mobile: scroll', { direction: 'down' })
      const labelError = await waitForElement(driver, 'one-native-picker-passkit-label-error')
      expect(await labelError.getText()).toContain('PayWithApplePayButtonLabel')
    })
  })

  // -- map controls (WRITTEN, interaction legs not RAN: device proof belongs to the lane) --

  describe('One Native Map Controls', () => {
    // mapkit reports the camera it settles on at first appearance, several identical
    // onEnd callbacks in one tick, so the initialized count is read from the device
    // once the seeded camera is reported. automatic framing of the two pins would
    // center elsewhere, so the seeded center proves the props placed the camera.
    const seeded = 'Center: 37.7955,-122.3937'
    let initialized = ''

    test('map mounts with its compass and pitch controls', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-map-controls')
      const view = await waitForElement(driver, 'one-native-map-controls-view', {
        timeout: 30_000,
      })
      expect(await view.isDisplayed()).toBe(true)

      const status = await waitForElement(driver, 'one-native-map-controls-status')
      await status.waitUntil(async () => (await status.getText()).includes(seeded), {
        timeout: 10_000,
        timeoutMsg: 'map did not report its seeded camera',
      })
      const text = await status.getText()
      expect(text).toContain('Controls: compass,pitch')
      initialized = text.match(/Regions: \d+ · Center: \S+/)![0]
      expect(Number(initialized.match(/Regions: (\d+)/)![1])).toBeGreaterThan(0)

      await captureScreenshot(driver, 'one-native-map-controls-mounted')
    })

    test('toggling controls remounts the slot without resetting the map', sharedTestOptions, async () => {
      expect(initialized).toContain(seeded)
      await (await waitForElement(driver, 'one-native-map-controls-toggle-user')).click()
      const status = await waitForElement(driver, 'one-native-map-controls-status')
      await status.waitUntil(
        async () => (await status.getText()).includes('Controls: compass,pitch,user'),
        { timeout: 5000, timeoutMsg: 'user location control did not mount' }
      )

      await (await waitForElement(driver, 'one-native-map-controls-toggle-compass')).click()
      await status.waitUntil(
        async () => (await status.getText()).includes('Controls: pitch,user'),
        { timeout: 5000, timeoutMsg: 'compass control did not unmount' }
      )
      expect(await status.getText()).toContain(initialized)

      await captureScreenshot(driver, 'one-native-map-controls-toggled')

      // a real pan must move both the count and the center, or the unchanged
      // status above would prove nothing about camera resets.
      const rect = await driver.getElementRect(
        await (await waitForElement(driver, 'one-native-map-controls-view')).elementId
      )
      const x = rect.x + rect.width / 2
      const y = rect.y + rect.height / 2
      await driver.execute('mobile: dragFromToForDuration', {
        duration: 0.5,
        fromX: x,
        fromY: y,
        toX: x - rect.width / 3,
        toY: y - rect.height / 4,
      })
      await status.waitUntil(
        async () => {
          const text = await status.getText()
          return !text.includes(initialized) && !text.includes(seeded)
        },
        { timeout: 5000, timeoutMsg: 'a pan did not report a new camera' }
      )
    })

    test('a non-control child throws instead of mounting', sharedTestOptions, async () => {
      await (await waitForElement(driver, 'one-native-map-controls-invalid')).click()
      await dismissExpectedRenderError(driver, 'One.iOS.Map accepts')
      const error = await waitForElement(driver, 'one-native-map-controls-error')
      expect(await error.getText()).toContain('One.iOS.Map accepts')
    })
  })

  // -- geometry reader (WRITTEN, interaction legs not RAN: device proof belongs to the lane) --

  describe('One Native Geometry Reader', () => {
    test('reader mounts and reports its laid-out frame', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-geometry-reader')
      const view = await waitForElement(driver, 'one-native-geometry-reader-view', {
        timeout: 30_000,
      })
      expect(await view.isDisplayed()).toBe(true)

      const status = await waitForElement(driver, 'one-native-geometry-reader-status')
      await status.waitUntil(
        async () => (await status.getText()).includes('Frame: 200x100'),
        { timeout: 10_000, timeoutMsg: 'geometry reader did not report its frame' }
      )

      await captureScreenshot(driver, 'one-native-geometry-reader-mounted')
    })

    test('resizing the reader reports the new frame', sharedTestOptions, async () => {
      const toggle = await waitForElement(driver, 'one-native-geometry-reader-toggle-width')
      await toggle.click()
      const status = await waitForElement(driver, 'one-native-geometry-reader-status')
      await status.waitUntil(
        async () => (await status.getText()).includes('Frame: 120x100'),
        { timeout: 10_000, timeoutMsg: 'resized frame was not reported' }
      )

      await captureScreenshot(driver, 'one-native-geometry-reader-resized')
    })

    test('static children throw instead of mounting', sharedTestOptions, async () => {
      const invalid = await waitForElement(
        driver,
        'one-native-geometry-reader-invalid-static'
      )
      await invalid.click()
      await dismissExpectedRenderError(
        driver,
        'Swift.GeometryReader takes a render function'
      )
      const error = await waitForElement(
        driver,
        'one-native-geometry-reader-static-error'
      )
      expect(await error.getText()).toContain('takes a render function')
    })

    test('React Native children throw instead of mounting', sharedTestOptions, async () => {
      const invalid = await waitForElement(
        driver,
        'one-native-geometry-reader-invalid-native'
      )
      await invalid.click()
      await dismissExpectedRenderError(driver, 'Swift.GeometryReader takes SwiftUI children')
      const error = await waitForElement(
        driver,
        'one-native-geometry-reader-native-error'
      )
      expect(await error.getText()).toContain('takes SwiftUI children')
    })
  })

  // -- scroll view reader: proxy.scrollTo moves the SwiftUI scroll view that
  // reports its content offset through the SDK's onScrollGeometryChange --

  describe('One Native Scroll Reader', () => {
    const offsetOf = async (testID: string, label: string) => {
      const text = await (await waitForElement(driver, testID)).getText()
      const match = text.match(new RegExp(`${label}: (-?\\d+)`))
      if (!match) throw new Error(`no ${label} in ${text}`)
      return Number(match[1])
    }
    const scrollAndSettle = async (button: string, last: string) => {
      await (await waitForElement(driver, button)).click()
      const status = await waitForElement(driver, 'one-native-scroll-reader-status')
      await status.waitUntil(async () => (await status.getText()).includes(`Last: ${last}`), {
        timeout: 10_000,
        timeoutMsg: `scrollTo ${last} did not run`,
      })
      // the offset settles when two reads a frame apart agree.
      let previous = Number.NaN
      await status.waitUntil(
        async () => {
          const next = await offsetOf('one-native-scroll-reader-status', 'Offset')
          const settled = next === previous
          previous = next
          return settled
        },
        { timeout: 10_000, interval: 250, timeoutMsg: `offset after ${last} did not settle` }
      )
      return previous
    }

    test('reader mounts its content at the top', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-scroll-reader')
      const view = await waitForElement(driver, 'one-native-scroll-reader-view', {
        timeout: 30_000,
      })
      expect(await view.isDisplayed()).toBe(true)
      expect(await offsetOf('one-native-scroll-reader-status', 'Offset')).toBe(0)
      await captureScreenshot(driver, 'one-native-scroll-reader-mounted')
    })

    test('scrollTo moves the scroll view to each anchor', sharedTestOptions, async () => {
      // explicit zero spacing makes bottom alignment differ from top and center.
      const bottom = await scrollAndSettle('one-native-scroll-reader-bottom', 'row-29 bottom')
      expect(bottom).toBe(30 * 40 - 200)
      await captureScreenshot(driver, 'one-native-scroll-reader-bottom')
      const visible = await scrollAndSettle('one-native-scroll-reader-visible', 'row-29 nil')
      expect(visible).toBe(bottom)
      const top = await scrollAndSettle('one-native-scroll-reader-top', 'row-0 top')
      expect(top).toBe(0)
      // a nil anchor reveals row-39 with the least scrolling: the end of content.
      const nil = await scrollAndSettle('one-native-scroll-reader-nil', 'row-39 nil')
      expect(nil).toBe(40 * 40 - 200)
    })

    test('an id no view carries leaves the scroll view where it was', sharedTestOptions, async () => {
      const before = await offsetOf('one-native-scroll-reader-status', 'Offset')
      expect(before).toBeGreaterThan(0)
      const after = await scrollAndSettle('one-native-scroll-reader-missing', 'missing top')
      expect(after).toBe(before)
    })

    test('an invalid anchor throws instead of scrolling', sharedTestOptions, async () => {
      const before = await offsetOf('one-native-scroll-reader-status', 'Offset')
      await (await waitForElement(driver, 'one-native-scroll-reader-invalid-anchor')).click()
      const error = await waitForElement(driver, 'one-native-scroll-reader-anchor-error')
      expect(await error.getText()).toContain('anchor must be a UnitPoint')
      expect(await offsetOf('one-native-scroll-reader-status', 'Offset')).toBe(before)
    })

    test('scrollTo from a mount effect runs once the reader appears', sharedTestOptions, async () => {
      await (await waitForElement(driver, 'one-native-scroll-reader-mount')).click()
      const status = await waitForElement(driver, 'one-native-scroll-reader-mount-status')
      // row-20 at the top edge sits below exactly 20 rows.
      await status.waitUntil(
        async () => (await offsetOf('one-native-scroll-reader-mount-status', 'Mount offset')) === 20 * 40,
        { timeout: 10_000, timeoutMsg: 'mount-time scrollTo did not reach row-20' }
      )
      await captureScreenshot(driver, 'one-native-scroll-reader-mount')
    })

    test('scrollTo while the content builds throws', sharedTestOptions, async () => {
      await (await waitForElement(driver, 'one-native-scroll-reader-building')).click()
      await dismissExpectedRenderError(
        driver,
        'Swift.ScrollViewProxy.scrollTo cannot run while Swift.ScrollViewReader builds'
      )
      const error = await waitForElement(driver, 'one-native-scroll-reader-building-error')
      expect(await error.getText()).toContain('cannot run while Swift.ScrollViewReader builds')
    })
  })

  // -- phase and keyframe animators: SwiftUI runs the timing and interpolation --

  describe('One Native Animators', () => {
    const logOf = async (testID: string) => (await waitForElement(driver, testID)).getText()

    // magenta columns on the cycling box's center row, in points.
    async function cycleWidth() {
      const box = await waitForElement(driver, 'one-native-animators-cycle')
      const [{ x, y }, { width, height }, window] = await Promise.all([
        box.getLocation(),
        box.getSize(),
        driver.getWindowSize(),
      ])
      const { data, info } = await sharp(Buffer.from(await driver.takeScreenshot(), 'base64'))
        .raw()
        .toBuffer({ resolveWithObject: true })
      const scale = info.width / window.width
      const row = Math.round((y + height / 2) * scale)
      let columns = 0
      for (let column = Math.round(x * scale); column < Math.round((x + width) * scale); column++) {
        const offset = (row * info.width + column) * info.channels
        if (data[offset] > 230 && data[offset + 1] < 40 && data[offset + 2] > 230) columns++
      }
      return columns / scale
    }

    test('phase animator mounts at its first phase', sharedTestOptions, async () => {
      await navigateTo(driver, '/one-native-animators')
      const phase = await waitForElement(driver, 'one-native-animators-phase', { timeout: 30_000 })
      expect(await phase.isDisplayed()).toBe(true)
      const log = await waitForElement(driver, 'one-native-animators-phase-log')
      await log.waitUntil(async () => (await log.getText()) === 'Phases: 60', {
        timeout: 10_000,
        timeoutMsg: 'phase animator did not lay out its first phase',
      })
      await captureScreenshot(driver, 'one-native-animators-mounted')
    })

    test('a trigger runs every phase once and returns to the first', sharedTestOptions, async () => {
      await (await waitForElement(driver, 'one-native-animators-run-phases')).click()
      const log = await waitForElement(driver, 'one-native-animators-phase-log')
      await log.waitUntil(async () => (await log.getText()) === 'Phases: 60 140 100 60', {
        timeout: 10_000,
        timeoutMsg: 'phases did not run in order once',
      })
    })

    test('a trigger during a run interrupts it and settles at the first phase', sharedTestOptions, async () => {
      await (await waitForElement(driver, 'one-native-animators-interrupt-phases')).click()
      const log = await waitForElement(driver, 'one-native-animators-phase-log')
      await log.waitUntil(
        async () => {
          const widths = (await log.getText()).replace('Phases: ', '').split(' ')
          return widths.length > 4 && widths.at(-1) === '60' && widths.slice(4).includes('140')
        },
        { timeout: 10_000, timeoutMsg: 'interrupted phases did not settle at the first phase' }
      )
      await captureScreenshot(driver, 'one-native-animators-phases-interrupted')
    })

    test('SwiftUI interpolates between phases instead of jumping', sharedTestOptions, async () => {
      const widths: number[] = []
      for (let sample = 0; sample < 6; sample++) widths.push(await cycleWidth())
      // a snap would only ever show the 40 and 240 point phases.
      const between = widths.filter((width) => width > 44 && width < 236)
      expect(new Set(between.map(Math.round)).size, `widths ${widths.join(', ')}`).toBeGreaterThanOrEqual(2)
      await captureScreenshot(driver, 'one-native-animators-cycling')
    })

    test('keyframes render intermediate values and return to the start', sharedTestOptions, async () => {
      await (await waitForElement(driver, 'one-native-animators-run-keyframes')).click()
      const log = await waitForElement(driver, 'one-native-animators-keyframe-log')
      await log.waitUntil(async () => /max 220, last 60$/.test(await log.getText()), {
        timeout: 10_000,
        timeoutMsg: 'keyframes did not reach 220 and return to 60',
      })
      // a JS-sampled or snapping timeline would report only a few widths.
      const frames = Number(/Keyframes: (\d+) frames/.exec(await logOf('one-native-animators-keyframe-log'))![1])
      expect(frames).toBeGreaterThan(20)
    })

    test('a keyframe trigger during a run restarts from the current value', sharedTestOptions, async () => {
      const before = Number(/Keyframes: (\d+) frames/.exec(await logOf('one-native-animators-keyframe-log'))![1])
      await (await waitForElement(driver, 'one-native-animators-interrupt-keyframes')).click()
      const log = await waitForElement(driver, 'one-native-animators-keyframe-log')
      await log.waitUntil(
        async () => {
          const text = await log.getText()
          return Number(/Keyframes: (\d+) frames/.exec(text)![1]) > before + 20 && text.endsWith('last 60')
        },
        { timeout: 10_000, timeoutMsg: 'interrupted keyframes did not run again and settle at 60' }
      )
      await captureScreenshot(driver, 'one-native-animators-keyframes-interrupted')
    })

    for (const [testID, message] of [
      ['one-native-animators-invalid-empty', 'Swift.PhaseAnimator phases must not be empty'],
      ['one-native-animators-invalid-static', 'Swift.PhaseAnimator takes a content function of its phase'],
      ['one-native-animators-invalid-prop', 'Swift.PhaseAnimator content can vary only swiftStyle by phase'],
      ['one-native-animators-invalid-curve', 'Swift.KeyframeAnimator content must map its value linearly to swiftStyle numbers; width does not'],
      ['one-native-animators-invalid-keyframes', 'Swift.KeyframeAnimator keyframes must not depend on their value argument'],
    ])
      test(`${testID.replace('one-native-animators-invalid-', '')} content throws instead of mounting`, sharedTestOptions, async () => {
        await navigateTo(driver, '/one-native-animators')
        await (await waitForElement(driver, testID, { timeout: 30_000 })).click()
        await dismissExpectedRenderError(driver, message)
        const error = await waitForElement(driver, 'one-native-animators-error')
        expect(await error.getText()).toContain(message)
      })
  })
  describe('Zoom Transitions', () => {
    test(
      'native zoom resolves its mounted source and alignment with controls',
      sharedTestOptions,
      async () => {
        const capabilities = getWebDriverConfig().capabilities as Record<string, any>
        const simulatorId = capabilities['appium:options'].udid
        const bundleId =
          capabilities['appium:options']?.bundleId ||
          capabilities['appium:bundleId'] ||
          capabilities.bundleId
        expect(simulatorId).toMatch(/^[0-9A-F-]{36}$/i)
        expect(bundleId).toBeTypeOf('string')
        await navigateTo(driver, '/zoom-test')
        await runZoomWithAppium(
          driver,
          simulatorId,
          bundleId,
          process.env.ZOOM_ARTIFACT_DIR || '/tmp/one-native-zoom-e2e',
          (name) => captureScreenshot(driver, name),
        )
      }
    )
  })
})
