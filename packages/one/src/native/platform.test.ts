import { describe, expect, test } from 'vitest'
import {
  androidAdapter,
  assertPlatformAdapter,
  iosAdapter,
  rnxAdapter,
  selectOneNativePlatform,
  webAdapter,
} from './platform'

describe('OneNativePlatform contract', () => {
  test('web, ios, android, and rnx adapters pass', () => {
    for (const adapter of [webAdapter, iosAdapter, androidAdapter, rnxAdapter]) {
      expect(() => assertPlatformAdapter(adapter)).not.toThrow()
    }
  })

  test('build-time selection returns exactly one adapter', () => {
    expect(selectOneNativePlatform('ios')).toBe(iosAdapter)
    expect(selectOneNativePlatform('android')).toBe(androidAdapter)
    expect(selectOneNativePlatform('web')).toBe(webAdapter)
    expect(selectOneNativePlatform('rnx')).toBe(rnxAdapter)
  })

  test('ios never carries android bindings and vice versa', () => {
    expect(iosAdapter.platformBindings.Android).toBeUndefined()
    expect(androidAdapter.platformBindings.iOS).toBeUndefined()
    expect(webAdapter.platformBindings.iOS).toBeUndefined()
    expect(rnxAdapter.platformBindings.Android).toBeUndefined()
  })

  test('missing required entries fail', () => {
    expect(() =>
      assertPlatformAdapter({ ...webAdapter, operations: {} } as any)
    ).toThrow()
    expect(() =>
      assertPlatformAdapter({ ...webAdapter, components: {} } as any)
    ).toThrow()
    expect(() =>
      assertPlatformAdapter({
        ...webAdapter,
        platformBindings: { iOS: {} },
      } as any)
    ).toThrow()
  })
})
