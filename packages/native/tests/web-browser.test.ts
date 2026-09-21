import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  WebBrowserResultType,
  dismissBrowser,
  openAuthSessionAsync,
  openBrowserAsync,
} from '../src/web-browser/index'
import { normalizeAuthResult, normalizeResult } from '../src/web-browser/result'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('web-browser web', () => {
  it('opens a blank-target popup and reports opened', async () => {
    const open = vi.fn(() => ({ closed: false }))
    vi.stubGlobal('window', { open })
    expect(await openBrowserAsync('https://example.com')).toEqual({ type: 'opened' })
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener')
  })

  it('throws when the browser blocks the popup', async () => {
    vi.stubGlobal('window', { open: () => null })
    await expect(openBrowserAsync('https://example.com')).rejects.toThrow(
      /blocked the popup/
    )
    await expect(openAuthSessionAsync('https://example.com')).rejects.toThrow(
      /blocked the popup/
    )
  })

  it('resolves dismiss without native work', async () => {
    expect(await dismissBrowser()).toEqual({ type: 'dismiss' })
  })

  it('resolves cancel when the auth popup is already closed', async () => {
    vi.stubGlobal('window', { open: () => ({ closed: true }) })
    expect(await openAuthSessionAsync('https://example.com')).toEqual({
      type: 'cancel',
    })
  })
})

describe('normalizeResult', () => {
  it('passes every expo result type through', () => {
    for (const type of ['cancel', 'dismiss', 'opened', 'locked'] as const) {
      expect(normalizeResult({ type })).toEqual({ type })
    }
  })

  it('falls back to cancel for garbage', () => {
    expect(normalizeResult(null)).toEqual({ type: 'cancel' })
    expect(normalizeResult({ type: 'success' })).toEqual({ type: 'cancel' })
  })
})

describe('normalizeAuthResult', () => {
  it('passes a redirect result through', () => {
    expect(
      normalizeAuthResult({ type: 'success', url: 'nativefeatures://auth?code=1' })
    ).toEqual({ type: 'success', url: 'nativefeatures://auth?code=1' })
  })

  it('drops a redirect without a url to cancel', () => {
    expect(normalizeAuthResult({ type: 'success' })).toEqual({ type: 'cancel' })
    expect(normalizeAuthResult({ type: 'dismiss' })).toEqual({ type: 'dismiss' })
    expect(normalizeAuthResult(null)).toEqual({ type: 'cancel' })
  })

  it('keeps the expo result type values', () => {
    expect(WebBrowserResultType).toEqual({
      CANCEL: 'cancel',
      DISMISS: 'dismiss',
      OPENED: 'opened',
      LOCKED: 'locked',
    })
  })
})
