import { createElement, isValidElement } from 'react'
import { beforeAll, describe, expect, test, vi } from 'vitest'

vi.mock('react-native', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-native')>()
  return { Platform: { OS: 'ios', Version: '27.0' }, StyleSheet: actual.StyleSheet }
})
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', async () => {
  const { createElement } = await import('react')
  return { default: () => (props: object) => createElement('div', props) }
})

let Compose: typeof import('../src/platform/compose.android').Compose
let Image: typeof import('../src/platform/generated/Controls.native').Image
let AndroidIcon: typeof import('../src/platform/ui/Icon.android').Icon
let IOSIcon: typeof import('../src/platform/ui/Icon.ios').Icon
let WebIcon: typeof import('../src/platform/ui/Icon').Icon

type ResponsiveIconProps = {
  colorRole?: string
  style?: unknown
  swiftStyle?: Readonly<Record<string, unknown>>
  composeStyle?: Readonly<Record<string, unknown>>
}

let elements: import('../src/platform/ui/iconTypes').IconElements

beforeAll(async () => {
  Compose = (await import('../src/platform/compose.android')).Compose
  Image = (await import('../src/platform/generated/Controls.native')).Image
  AndroidIcon = (await import('../src/platform/ui/Icon.android')).Icon
  IOSIcon = (await import('../src/platform/ui/Icon.ios')).Icon
  WebIcon = (await import('../src/platform/ui/Icon')).Icon
  elements = {
    ios: createElement(Image, {
      systemName: 'square.and.arrow.up',
      swiftStyle: { fontSize: 20, foregroundStyle: '#000000' },
    }),
    android: createElement(Compose.Icon, {
      name: 'share',
      size: 20,
      composeStyle: { width: 20, foregroundColor: '#000000' },
    }),
    web: createElement('span'),
  }
})

describe('One.UI.Icon', () => {
  test('injects a native role without replacing platform icon props', () => {
    const ios = IOSIcon({ icons: elements, colorRole: 'accent' })
    const android = AndroidIcon({ icons: elements, colorRole: 'secondary' })
    if (
      !isValidElement<ResponsiveIconProps>(ios) ||
      !isValidElement<ResponsiveIconProps>(android)
    )
      throw new Error('expected platform icon elements')

    expect(ios.type).toBe(Image)
    expect(ios.props.colorRole).toBe('accent')
    expect(ios.props.swiftStyle).toEqual({
      fontSize: 20,
      width: 20,
      height: 20,
      foregroundStyle: undefined,
    })
    expect(ios.props.style).toEqual([{ width: 20, height: 20 }, undefined])
    expect(android.props.colorRole).toBe('secondary')
    expect(android.props.style).toEqual([{ width: 20, height: 20 }, undefined])
    expect(android.props.composeStyle).toEqual({
      width: 20,
      height: 20,
      foregroundColor: undefined,
    })
  })

  test('applies a literal color through each native style and leaves web unchanged', () => {
    const ios = IOSIcon({ icons: elements, color: '#123456' })
    const android = AndroidIcon({ icons: elements, color: '#123456' })
    if (
      !isValidElement<ResponsiveIconProps>(ios) ||
      !isValidElement<ResponsiveIconProps>(android)
    )
      throw new Error('expected platform icon elements')

    expect(ios.props.colorRole).toBeUndefined()
    expect(ios.props.swiftStyle).toEqual({
      fontSize: 20,
      width: 20,
      height: 20,
      foregroundStyle: '#123456',
    })
    expect(android.props.colorRole).toBeUndefined()
    expect(android.props.style).toEqual([{ width: 20, height: 20 }, undefined])
    expect(android.props.composeStyle).toEqual({
      width: 20,
      height: 20,
      foregroundColor: '#123456',
    })
    expect(WebIcon({ icons: elements, color: '#123456' })).toBe(elements.web)
  })

  test('defaults native icons to the primary system role', () => {
    const ios = IOSIcon({ icons: elements })
    const android = AndroidIcon({ icons: elements })
    if (
      !isValidElement<ResponsiveIconProps>(ios) ||
      !isValidElement<ResponsiveIconProps>(android)
    )
      throw new Error('expected platform icon elements')

    expect(ios.props.colorRole).toBe('primary')
    expect(android.props.colorRole).toBe('primary')
  })

  test('keeps Yoga and SwiftUI frames equal for defaults and nested style overrides', () => {
    const defaultIcon = IOSIcon({
      icons: { ios: createElement(Image, { systemName: 'star' }) },
    })
    const styledIcon = IOSIcon({
      icons: {
        ios: createElement(Image, {
          systemName: 'star',
          swiftStyle: { fontSize: 36, width: 48, height: 32 },
          style: [{ width: 44 }, [{ height: 28 }]],
        }),
      },
    })
    if (
      !isValidElement<ResponsiveIconProps>(defaultIcon) ||
      !isValidElement<ResponsiveIconProps>(styledIcon)
    )
      throw new Error('expected iOS icon elements')

    expect(defaultIcon.props.style).toEqual([{ width: 24, height: 24 }, undefined])
    expect(defaultIcon.props.swiftStyle).toMatchObject({
      fontSize: 24,
      width: 24,
      height: 24,
    })
    expect(styledIcon.props.style).toEqual([
      { width: 48, height: 32 },
      [{ width: 44 }, [{ height: 28 }]],
    ])
    expect(styledIcon.props.swiftStyle).toMatchObject({
      fontSize: 36,
      width: 44,
      height: 28,
    })
  })

  test('rejects native elements that cannot consume the color contract', () => {
    const invalid = {
      ios: createElement('span'),
      android: createElement('span'),
    }
    expect(() => Reflect.apply(IOSIcon, null, [{ icons: invalid }])).toThrow(
      /One\.iOS\.Image/
    )
    expect(() => Reflect.apply(AndroidIcon, null, [{ icons: invalid }])).toThrow(
      /One\.Android\.Icon/
    )
  })

  test('rejects an invalid iOS role before it reaches Swift', () => {
    expect(() =>
      Reflect.apply(Image, null, [{ systemName: 'star', colorRole: 'not-a-role' }])
    ).toThrow(/colorRole/)
  })

  test('rejects an invalid Android role before it reaches Kotlin', () => {
    expect(() =>
      Reflect.apply(AndroidIcon, null, [{ icons: elements, colorRole: 'not-a-role' }])
    ).toThrow(/colorRole/)
  })

  test('delegates labeled images to native accessibility and hides decoration', () => {
    const labeled = Image({ systemName: 'star', accessibilityLabel: 'Favorite' })
    const decorative = Image({ systemName: 'star' })

    expect(labeled.props).toMatchObject({
      accessible: false,
      accessibilityLabel: 'Favorite',
      accessibilityElementsHidden: false,
      accessibilityRole: 'image',
    })
    expect(decorative.props).toMatchObject({
      accessible: false,
      accessibilityElementsHidden: true,
      accessibilityRole: 'image',
    })
  })
})
