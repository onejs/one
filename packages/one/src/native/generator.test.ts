import { describe, expect, test } from 'vitest'
import {
  emitPlatformBinding,
  representativeAndroidDeclaration,
  representativeAppleDeclaration,
  validateBindingMatchesDeclaration,
} from './generator'

describe('platform generator mechanism', () => {
  test('representative apple and android declarations regenerate byte-identically', () => {
    for (const declaration of [representativeAppleDeclaration, representativeAndroidDeclaration]) {
      const first = emitPlatformBinding(declaration)
      const second = emitPlatformBinding(declaration)
      expect(second).toBe(first)
      expect(() => validateBindingMatchesDeclaration(first, declaration)).not.toThrow()
    }
  })

  test('emitted bindings stay under One.iOS and One.Android', () => {
    expect(emitPlatformBinding(representativeAppleDeclaration)).toContain('One.iOS')
    expect(emitPlatformBinding(representativeAndroidDeclaration)).toContain('One.Android')
    expect(emitPlatformBinding(representativeAppleDeclaration)).not.toContain('One.ios')
    expect(emitPlatformBinding(representativeAndroidDeclaration)).not.toContain('One.android')
  })

  test('hand rename or signature drift fails the check', () => {
    const emitted = emitPlatformBinding(representativeAppleDeclaration)
    const renamed = {
      ...representativeAppleDeclaration,
      member: 'safeAreaInset',
    }
    expect(() => validateBindingMatchesDeclaration(emitted, renamed)).toThrow()
    const relabeled = {
      ...representativeAppleDeclaration,
      parameters: [{ label: 'x', name: 'top', type: 'number' }],
    }
    expect(() => validateBindingMatchesDeclaration(emitted, relabeled)).toThrow()
  })
})
