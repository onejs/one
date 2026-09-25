import { beforeAll, describe, expect, it, vi } from 'vitest'

// same seam as edgeFade.test.ts: plain functions over the spec modules,
// react never mounted, only the touched react-native surface mocked.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  StyleSheet: {
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    flatten: (style: unknown) => style,
  },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Blur: typeof import('../src/platform/effects/Blur.native').Blur
let RN: typeof import('react-native')

beforeAll(async () => {
  Blur = (await import('../src/platform/effects/Blur.native')).Blur
  RN = await import('react-native')
})

describe('Blur', () => {
  it('normalizes expo-unit intensity and defaults tint to default', () => {
    const element = Blur({ intensity: 34, tint: 'systemChromeMaterial' } as never)
    expect(element.type).toBe(RN.View)
    expect(element.props.style).toEqual([{ backgroundColor: 'transparent' }, undefined])
    const [native] = element.props.children as Array<{ type: unknown; props: Record<string, unknown> }>
    expect(native?.type).toEqual({ __component: 'OneNativeBlur' })
    expect(native?.props).toMatchObject({ intensity: 0.34, tint: 'systemChromeMaterial' })
  })

  it('clamps intensity into 0-1', () => {
    const readIntensity = (props: never) => {
      const element = Blur(props)
      const [native] = element.props.children as Array<{ props: { intensity: number } }>
      return native?.props.intensity
    }
    expect(readIntensity({} as never)).toBe(0.5)
    expect(readIntensity({ intensity: 0 } as never)).toBe(0)
    expect(readIntensity({ intensity: 100 } as never)).toBe(1)
    expect(readIntensity({ intensity: 250 } as never)).toBe(1)
    expect(readIntensity({ intensity: -30 } as never)).toBe(0)
  })

  it('renders children sharp above the blur view', () => {
    const element = Blur({ intensity: 60, children: 'label' } as never)
    const children = element.props.children as Array<unknown>
    expect(children).toHaveLength(2)
    expect(children[1]).toBe('label')
  })
})
