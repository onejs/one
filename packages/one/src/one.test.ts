import { describe, expect, test } from 'vitest'
import { One } from './one'

describe('root One export', () => {
  test('imports on web with no native implementation present', () => {
    expect(One.platform).toBe('web')
    expect(One.iOS).toBeUndefined()
    expect(One.Android).toBeUndefined()
    expect(One.selectAdapter('ios').name).toBe('ios')
  })
})
