import { createElement, isValidElement, type ReactElement } from 'react'
import { describe, expect, test } from 'vitest'
import { Icon as AndroidIcon } from '../src/ui/Icon.android'
import { Icon as IOSIcon } from '../src/ui/Icon.ios'
import { Icon as WebIcon } from '../src/ui/Icon'

type TestIconProps = {
  colorRole?: string
  swiftStyle?: Readonly<Record<string, unknown>>
  composeStyle?: Readonly<Record<string, unknown>>
}

function TestIcon(_props: TestIconProps): ReactElement | null {
  return null
}

const elements = {
  ios: createElement(TestIcon, { swiftStyle: { fontSize: 20 } }),
  android: createElement(TestIcon, { composeStyle: { width: 20 } }),
  web: createElement(TestIcon),
}

describe('One.UI.Icon', () => {
  test('injects a native role without replacing platform icon props', () => {
    const ios = IOSIcon({ icons: elements, colorRole: 'accent' })
    const android = AndroidIcon({ icons: elements, colorRole: 'secondary' })
    if (!isValidElement<TestIconProps>(ios) || !isValidElement<TestIconProps>(android))
      throw new Error('expected platform icon elements')

    expect(ios.type).toBe(TestIcon)
    expect(ios.props.colorRole).toBe('accent')
    expect(ios.props.swiftStyle).toEqual({ fontSize: 20 })
    expect(android.type).toBe(TestIcon)
    expect(android.props.colorRole).toBe('secondary')
    expect(android.props.composeStyle).toEqual({ width: 20 })
  })

  test('applies a literal color through each native style and leaves web unchanged', () => {
    const ios = IOSIcon({ icons: elements, color: '#123456' })
    const android = AndroidIcon({ icons: elements, color: '#123456' })
    if (!isValidElement<TestIconProps>(ios) || !isValidElement<TestIconProps>(android))
      throw new Error('expected platform icon elements')

    expect(ios.props.colorRole).toBeUndefined()
    expect(ios.props.swiftStyle).toEqual({
      fontSize: 20,
      foregroundStyle: '#123456',
    })
    expect(android.props.colorRole).toBeUndefined()
    expect(android.props.composeStyle).toEqual({
      width: 20,
      foregroundColor: '#123456',
    })
    expect(WebIcon({ icons: elements, color: '#123456' })).toBe(elements.web)
  })

  test('defaults native icons to the primary system role', () => {
    const ios = IOSIcon({ icons: elements })
    const android = AndroidIcon({ icons: elements })
    if (!isValidElement<TestIconProps>(ios) || !isValidElement<TestIconProps>(android))
      throw new Error('expected platform icon elements')

    expect(ios.props.colorRole).toBe('primary')
    expect(android.props.colorRole).toBe('primary')
  })
})
