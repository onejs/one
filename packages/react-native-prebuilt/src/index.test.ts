import { describe, expect, it } from 'vitest'

import { RExports } from './index'

describe('RExports', () => {
  it('should contain all keys that the `react` package exports', async () => {
    const React = (await import('react')).default

    for (const key in React) {
      expect(RExports).toContain(key)
    }
  })
})

// describe('RNExportNames', () => {
//   // RN can't be imported directly so no way to test like this :(
//   // it('should contain all keys that the `react-native` package exports', async () => {
//   //   const ReactNative = (await import('react-native')).default

//   //   for (const key in ReactNative) {
//   //     expect(RNExportNames).toContain(key)
//   //   }
//   // })
// })
