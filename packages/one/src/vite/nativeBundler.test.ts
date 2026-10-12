import { afterEach, describe, expect, test } from 'vitest'
import { resolveNativeBundler } from './nativeBundler'

afterEach(() => {
  delete process.env.ONE_METRO_MODE
})

describe('native bundler selection', () => {
  test('omitted configuration selects rolldown', () => {
    expect(resolveNativeBundler({})).toBe('vite')
    expect(resolveNativeBundler({ bundler: 'vite' })).toBe('vite')
  })

  test('metro runs only when explicitly selected', () => {
    expect(resolveNativeBundler({ bundler: 'metro' })).toBe('metro')
    process.env.ONE_METRO_MODE = '1'
    expect(resolveNativeBundler({})).toBe('metro')
  })
})
