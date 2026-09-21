import { describe, expect, test } from 'vitest'
import { pickOnePublicEnv } from './env'

describe('ONE_PUBLIC_* and ONE_PLATFORM contract', () => {
  test('aliases One values to Expo without creating One names from Expo input', () => {
    expect(pickOnePublicEnv({ ONE_PUBLIC_API: '1', VITE_X: '2' })).toEqual({
      ONE_PUBLIC_API: '1',
      EXPO_PUBLIC_API: '1',
    })
    expect(pickOnePublicEnv({ EXPO_PUBLIC_API: '2' })).toEqual({
      EXPO_PUBLIC_API: '2',
    })
    expect(pickOnePublicEnv({ ONE_PUBLIC_API: 'one', EXPO_PUBLIC_API: 'expo' })).toEqual({
      ONE_PUBLIC_API: 'one',
      EXPO_PUBLIC_API: 'expo',
    })
  })
})
