import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import * as constants from './constants'

describe('CACHE_KEY pinning', () => {
  let originalKey: string

  beforeEach(() => {
    originalKey = constants.CACHE_KEY
  })

  afterEach(() => {
    constants.setCacheKey(originalKey)
  })

  it('setCacheKey rebinds CACHE_KEY-derived postfixes', () => {
    constants.setCacheKey('9999999')

    expect(constants.CACHE_KEY).toBe('9999999')
    expect(constants.PRELOAD_JS_POSTFIX).toBe('_9999999_preload.js')
    expect(constants.CSS_PRELOAD_JS_POSTFIX).toBe('_9999999_preload_css.js')
    expect(constants.LOADER_JS_POSTFIX).toBe(
      `_9999999${constants.LOADER_JS_POSTFIX_UNCACHED}`
    )
  })

  it('setCacheKey is a no-op for empty or identical keys', () => {
    const before = constants.CACHE_KEY
    constants.setCacheKey('')
    expect(constants.CACHE_KEY).toBe(before)
    constants.setCacheKey(before)
    expect(constants.CACHE_KEY).toBe(before)
  })

  it('PRELOAD_JS_POSTFIX_REGEX matches the literal postfix shape with any digits', () => {
    constants.setCacheKey('12345')

    expect(constants.PRELOAD_JS_POSTFIX_REGEX.test('/assets/foo_12345_preload.js')).toBe(true)
    // also matches a drifted key — the whole point of the regex fallback
    expect(constants.PRELOAD_JS_POSTFIX_REGEX.test('/assets/foo_98765_preload.js')).toBe(true)
    // does not match unrelated paths
    expect(constants.PRELOAD_JS_POSTFIX_REGEX.test('/assets/foo_preload.js')).toBe(false)
    expect(constants.PRELOAD_JS_POSTFIX_REGEX.test('/assets/foo_12345_preload_css.js')).toBe(
      false
    )
  })

  it('CSS_PRELOAD_JS_POSTFIX_REGEX matches only the css variant', () => {
    expect(
      constants.CSS_PRELOAD_JS_POSTFIX_REGEX.test('/assets/foo_12345_preload_css.js')
    ).toBe(true)
    expect(constants.CSS_PRELOAD_JS_POSTFIX_REGEX.test('/assets/foo_12345_preload.js')).toBe(
      false
    )
  })
})
