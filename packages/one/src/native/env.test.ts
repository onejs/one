import { describe, expect, test } from 'vitest'
import { assertNoExpoPublicEnv, pickOnePublicEnv } from './env'

describe('ONE_PUBLIC_* and ONE_PLATFORM contract', () => {
  test('picks one-public values and rejects expo-prefixed input', () => {
    expect(
      pickOnePublicEnv({ ONE_PUBLIC_API: '1', VITE_X: '2' })
    ).toEqual({ ONE_PUBLIC_API: '1' })
    expect(() =>
      assertNoExpoPublicEnv({ EXPO_PUBLIC_API: '1' })
    ).toThrow(/rename it to ONE_PUBLIC_\*/)
  })
})
