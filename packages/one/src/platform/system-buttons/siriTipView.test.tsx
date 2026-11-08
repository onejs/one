import { beforeEach, describe, expect, test, vi } from 'vitest'

let currentOs: 'ios' | 'android' = 'ios'

vi.mock('react-native', () => ({
  Platform: {
    get OS() {
      return currentOs
    },
  },
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
    hairlineWidth: 0.5,
  },
  View: 'View',
  Text: 'Text',
  Pressable: 'Pressable',
}))

vi.mock('react', () => ({
  useState: <T,>(initial: T): [T, (next: T) => void] => [initial, () => {}],
}))

describe('SiriTipView', () => {
  beforeEach(() => {
    currentOs = 'ios'
  })

  test('renders phrase banner on iOS and hides when visible is false', async () => {
    const { SiriTipView } = await import('./index.native')
    const element = SiriTipView({
      phrase: 'Ask Contrast about my day',
      siriTipViewStyle: 'dark',
    })
    expect(element).not.toBeNull()
    expect(JSON.stringify(element)).toContain('Ask Contrast about my day')
    expect(SiriTipView({ phrase: 'Hidden', visible: false })).toBeNull()
  })

  test('throws on non-iOS platforms', async () => {
    currentOs = 'android'
    const { SiriTipView } = await import('./index.native')
    expect(() => SiriTipView({ phrase: 'Test' })).toThrow(
      'Swift.SiriTipView requires an iOS native build'
    )
    const web = await import('./index')
    expect(() => web.SiriTipView({ phrase: 'Test' })).toThrow(
      'Swift.SiriTipView requires an iOS native build'
    )
  })
})
