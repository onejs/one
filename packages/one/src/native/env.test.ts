import { describe, expect, test } from 'vitest'
import { pickOnePublicEnv } from './env'

describe('ONE_PUBLIC_* and ONE_PLATFORM contract', () => {
  test('picks One public values without rejecting Expo compatibility input', () => {
    expect(
      pickOnePublicEnv({
        ONE_PUBLIC_API: '1',
        EXPO_PUBLIC_USE_RN_FETCH: '1',
        VITE_X: '2',
      })
    ).toEqual({ ONE_PUBLIC_API: '1' })
  })
})
