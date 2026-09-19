import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// same seam as components.test.ts: the wrappers are plain functions over
// the spec modules, so a test reads the element each one builds. react is
// never mounted; only the react-native surface the wrappers touch is
// mocked, and the mocks only reach imports registered after them.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  I18nManager: { isRTL: false },
  View: () => null,
  StyleSheet: {
    flatten: (function flatten(
      style: unknown,
      into: Record<string, unknown> = {}
    ): Record<string, unknown> {
      if (Array.isArray(style)) style.forEach((entry) => flatten(entry, into))
      else if (style && typeof style === 'object') Object.assign(into, style)
      return into
    }) as (style: unknown) => Record<string, unknown>,
  },
  // minimal processColor: numbers pass through, #rgb/#rrggbb and the names
  // the tests use resolve to signed 0xAARRGGBB like the real one.
  processColor: (color: unknown): number | null => {
    if (typeof color === 'number') return color | 0
    if (typeof color !== 'string') return null
    if (color === 'black') return (0xff000000 as number) | 0
    if (color === 'white') return -1
    if (color === 'transparent') return 0
    const hex = color.startsWith('#') ? color.slice(1) : null
    if (hex && (hex.length === 3 || hex.length === 6)) {
      const full =
        hex.length === 3
          ? hex
              .split('')
              .map((c) => c + c)
              .join('')
          : hex
      return (0xff000000 | Number.parseInt(full, 16)) | 0
    }
    const rgba = color.match(
      /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)/
    )
    if (rgba) {
      const alpha = rgba[4] !== undefined ? Number(rgba[4]) : 1
      return (
        ((Math.round(alpha * 255) << 24) |
          (Number(rgba[1]) << 16) |
          (Number(rgba[2]) << 8) |
          Number(rgba[3])) |
        0
      )
    }
    return null
  },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let EdgeFade: typeof import('../src/effects/EdgeFade.native').EdgeFade
let curves: typeof import('../src/effects/curves')
let normalize: typeof import('../src/effects/normalize')
let RN: typeof import('react-native')

beforeAll(async () => {
  EdgeFade = (await import('../src/effects/EdgeFade.native')).EdgeFade
  curves = await import('../src/effects/curves')
  normalize = await import('../src/effects/normalize')
  RN = await import('react-native')
})

beforeEach(() => {
  RN.I18nManager.isRTL = false
  vi.restoreAllMocks()
})

describe('sampleCurve', () => {
  it('matches the native preset tables', () => {
    // smooth (1-t)^3, sharp (1-t)^5, gentle (1-t)^2 at t=16/31.
    expect(curves.sampleCurve('smooth')[16]).toBeCloseTo((1 - 16 / 31) ** 3, 3)
    expect(curves.sampleCurve('sharp')[16]).toBeCloseTo((1 - 16 / 31) ** 5, 3)
    expect(curves.sampleCurve('gentle')[16]).toBeCloseTo((1 - 16 / 31) ** 2, 3)
    expect(curves.sampleCurve('soft')[16]).toBeCloseTo(Math.cos((16 / 31) * (Math.PI / 2)), 3)
    for (const preset of ['smooth', 'smoother', 'sharp', 'gentle', 'soft', 'linear'] as const) {
      const samples = curves.sampleCurve(preset)
      expect(samples).toHaveLength(32)
      expect(samples[0]).toBe(1)
      expect(samples[31]).toBeCloseTo(0, 3)
    }
    // smootherstep is symmetric: alpha 0.5 halfway across.
    const smoother = curves.sampleCurve('smoother')
    expect((smoother[15]! + smoother[16]!) / 2).toBeCloseTo(0.5, 2)
    const linear = curves.sampleCurve('linear')
    expect(linear[0]).toBe(1)
    expect(linear[31]).toBe(0)
  })

  it('passes stops through clamped to [0, 1]', () => {
    expect(curves.sampleCurve({ type: 'stops', values: [1, 0.5, 0] })).toEqual([1, 0.5, 0])
    expect(curves.sampleCurve({ type: 'stops', values: [1.5, -0.5] })).toEqual([1, 0])
  })

  it('samples a symmetric bezier through the middle', () => {
    const samples = curves.sampleCurve({ type: 'cubicBezier', x1: 0.42, y1: 0, x2: 0.58, y2: 1 })
    expect(samples).toHaveLength(32)
    expect(samples[0]).toBe(1)
    expect(samples[31]).toBe(0)
    expect((samples[15]! + samples[16]!) / 2).toBeCloseTo(0.5, 1)
  })
})

describe('serializeCurve', () => {
  it('passes presets through and joins custom curves', () => {
    expect(curves.serializeCurve('gentle')).toBe('gentle')
    expect(curves.serializeCurve({ type: 'stops', values: [1, 0.5, 0] })).toBe('1,0.5,0')
    const bezier = curves.serializeCurve({ type: 'cubicBezier', x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 })
    expect(bezier.split(',')).toHaveLength(32)
  })
})

describe('resolveEdges', () => {
  it('resolves boolean, number, and config edge forms', () => {
    const resolved = normalize.resolveEdges({ bottom: 120, top: true })
    expect(resolved.bottom).toMatchObject({ size: 120, curve: 'smooth' })
    expect(resolved.top).toMatchObject({ size: 80, curve: 'smooth' })
    expect(resolved.left).toBeNull()
    expect(resolved.right).toBeNull()
    const config = normalize.resolveEdges({
      size: 40,
      left: { size: 64, curve: 'sharp', color: '#fff' },
    })
    expect(config.left).toMatchObject({ size: 64, curve: 'sharp', color: '#fff' })
  })

  it('maps start/end by layout direction with logical winning', () => {
    expect(normalize.resolveEdges({ start: 60 }).left?.size).toBe(60)
    expect(normalize.resolveEdges({ start: 60 }).right).toBeNull()
    expect(normalize.resolveEdges({ end: 60 }).right?.size).toBe(60)
    RN.I18nManager.isRTL = true
    expect(normalize.resolveEdges({ start: 60 }).right?.size).toBe(60)
    expect(normalize.resolveEdges({ start: 60 }).left).toBeNull()
    RN.I18nManager.isRTL = false
    // logical overrides physical on the same side.
    expect(normalize.resolveEdges({ left: 10, start: 70 }).left?.size).toBe(70)
  })

  it('infers overlay from color and warns when mask discards it', () => {
    expect(normalize.resolveEdges({ bottom: 80 }).mode).toBe('mask')
    expect(normalize.resolveEdges({ bottom: 80, color: '#000' }).mode).toBe('overlay')
    expect(normalize.resolveEdges({ bottom: { size: 80, color: '#000' } }).mode).toBe('overlay')
    expect(normalize.resolveEdges({ bottom: 80, color: '#000', mode: 'mask' }).mode).toBe('mask')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    normalize.resolveEdges({ bottom: 80, color: '#000', mode: 'mask' })
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain('ignored')
  })
})

describe('resolveEdges blur', () => {
  it('keeps blur explicit with clamped radius and progression', () => {
    expect(normalize.resolveEdges({ bottom: 80 }).mode).toBe('mask')
    const blur = normalize.resolveEdges({ bottom: 80, mode: 'blur' })
    expect(blur.mode).toBe('blur')
    expect(blur.blurRadius).toBe(28)
    expect(blur.frostProgression).toBe(1)
    const clamped = normalize.resolveEdges({ bottom: 80, mode: 'blur', blurRadius: -4, frostProgression: 9 })
    expect(clamped.blurRadius).toBe(0)
    expect(clamped.frostProgression).toBe(1)
    expect(
      normalize.resolveEdges({ bottom: 80, mode: 'blur', frostProgression: 0 }).frostProgression
    ).toBe(0.05)
  })

  it('warns when a per-edge color meets the global-only veil', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    normalize.resolveEdges({ bottom: { size: 80, color: '#fff' }, mode: 'blur' })
    expect(warn).toHaveBeenCalledOnce()
    expect(warn.mock.calls[0]?.[0]).toContain('frost veil')
  })
})

describe('resolveVeilColor', () => {
  it('resolves to 0xAARRGGBB with 0 for absent or opaque colors', () => {
    expect(normalize.resolveVeilColor(undefined)).toBe(0)
    expect(normalize.resolveVeilColor('#ff0000')).toBe((0xffff0000 as number) | 0)
    expect(normalize.resolveVeilColor(0x80000000 | 0)).toBe(0x80000000 | 0)
    expect(normalize.resolveVeilColor('not-a-color')).toBe(0)
  })
})

describe('resolveNativeProps', () => {
  it('flattens edges with smooth/zero defaults', () => {
    const native = normalize.resolveNativeProps(normalize.resolveEdges({ bottom: 96 }), 12)
    expect(native).toMatchObject({
      fadeTop: 0,
      fadeBottom: 96,
      fadeLeft: 0,
      fadeRight: 0,
      curveTop: 'smooth',
      curveBottom: 'smooth',
      fadeRadius: 12,
      mode: 'mask',
      blurRadius: 28,
      frostProgression: 1,
      overlayColor: 0,
    })
    const custom = normalize.resolveNativeProps(
      normalize.resolveEdges({ top: { size: 40, curve: { type: 'stops', values: [1, 0] } } })
    )
    expect(custom.curveTop).toBe('1,0')
    expect(custom.fadeRadius).toBe(0)
  })
})

describe('resolveRadius', () => {
  it('passes radius through and warns on style.borderRadius', () => {
    expect(normalize.resolveRadius(8, { flex: 1 })).toBe(8)
    expect(normalize.resolveRadius(undefined, { flex: 1 })).toBeUndefined()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(normalize.resolveRadius(undefined, { borderRadius: 8 })).toBeUndefined()
    expect(warn).toHaveBeenCalledOnce()
  })
})

describe('EdgeFade mask mode', () => {
  it('renders the primitive with flat props and no borderRadius', () => {
    const element = EdgeFade({ bottom: 80, style: [{ flex: 1 }, { borderRadius: 10 }] } as never)
    expect(element.type).toEqual({ __component: 'OneNativeEdgeFade' })
    expect(element.props).toMatchObject({
      fadeTop: 0,
      fadeBottom: 80,
      fadeLeft: 0,
      fadeRight: 0,
      curveBottom: 'smooth',
      fadeRadius: 0,
    })
    expect(element.props.style).toEqual({ flex: 1 })
  })

  it('forwards radius as fadeRadius', () => {
    const element = EdgeFade({ top: 40, radius: 14 } as never)
    expect(element.props.fadeRadius).toBe(14)
  })
})

describe('EdgeFade blur mode', () => {
  it('renders the primitive with blur props and no veil by default', () => {
    const element = EdgeFade({ bottom: 120, mode: 'blur', blurRadius: 24, curve: 'gentle' } as never)
    expect(element.type).toEqual({ __component: 'OneNativeEdgeFade' })
    expect(element.props).toMatchObject({
      fadeBottom: 120,
      curveBottom: 'gentle',
      mode: 'blur',
      blurRadius: 24,
      frostProgression: 1,
      overlayColor: 0,
    })
  })

  it('forwards the veil color and clamps the progression', () => {
    const element = EdgeFade({
      top: 160,
      mode: 'blur',
      color: '#0a0a0a',
      frostProgression: 0.5,
    } as never)
    expect(element.props.overlayColor).toBe((0xff0a0a0a as number) | 0)
    expect(element.props.frostProgression).toBe(0.5)
    const clamped = EdgeFade({ top: 160, mode: 'blur', frostProgression: 40 } as never)
    expect(clamped.props.frostProgression).toBe(1)
  })
})

describe('EdgeFade overlay mode', () => {
  const stripsOf = (element: { props: { children: unknown } }) =>
    (Array.isArray(element.props.children) ? element.props.children : [element.props.children])
      .filter((child) => child && typeof child === 'object' && 'type' in (child as object))
      .filter((child) => typeof (child as { type: unknown }).type === 'function')
      .map((child) => {
        const strip = child as { type: (props: never) => { props: { style: unknown } }; props: never }
        return strip.type(strip.props).props.style as Array<Record<string, unknown>>
      })

  it('paints one core gradient strip per edge, opaque outside to clear inside', () => {
    const element = EdgeFade({ bottom: 100, color: '#000000' } as never)
    expect(element.type).toBe(RN.View)
    const strips = stripsOf(element)
    expect(strips).toHaveLength(1)
    const [layout, paint] = strips[0] as [
      { height: number; bottom: number },
      { backgroundImage: Array<{ direction: string; colorStops: Array<{ color: string; positions: string[] }> }> },
    ]
    expect(layout.height).toBe(100)
    expect(layout.bottom).toBe(0)
    expect(paint.backgroundImage).toHaveLength(1)
    const [gradient] = paint.backgroundImage
    expect(gradient?.direction).toBe('to top')
    expect(gradient?.colorStops).toHaveLength(32)
    // outer edge (0%) opaque black, inner edge (100%) transparent.
    expect(gradient?.colorStops[0]).toMatchObject({ color: 'rgba(0,0,0,1)', positions: ['0.00%'] })
    expect(gradient?.colorStops[31]?.color).toBe('rgba(0,0,0,0)')
    expect(gradient?.colorStops[31]?.positions).toEqual(['100.00%'])
    // the ramp is monotone: alpha only falls going inward.
    const alphaOf = (color: string) => Number(color.match(/rgba\(\d+,\d+,\d+,([\d.]+)\)/)?.[1])
    const alphas = gradient!.colorStops.map((stop) => alphaOf(stop.color))
    for (let i = 1; i < alphas.length; i++) {
      expect(alphas[i]).toBeLessThanOrEqual(alphas[i - 1]!)
    }
  })

  it('aims each strip from its outer edge inward', () => {
    const top = stripsOf(EdgeFade({ top: 40, color: '#000' } as never))
    const left = stripsOf(EdgeFade({ left: 40, color: '#000' } as never))
    const right = stripsOf(EdgeFade({ right: 40, color: '#000' } as never))
    const directionOf = (strip: Array<Record<string, unknown>>) =>
      (strip[1]?.['backgroundImage'] as Array<{ direction: string }>)?.[0]?.direction
    expect(directionOf(top[0]!)).toBe('to bottom')
    expect(directionOf(left[0]!)).toBe('to right')
    expect(directionOf(right[0]!)).toBe('to left')
  })

  it('lets a per-edge color override the global one', () => {
    const element = EdgeFade({
      top: 40,
      bottom: { size: 40, color: '#ff0000' },
      color: '#000000',
    } as never)
    const strips = stripsOf(element)
    expect(strips).toHaveLength(2)
    const rgbOf = (strip: Array<Record<string, unknown>>) => {
      const stops = (strip[1]?.['backgroundImage'] as Array<{ colorStops: Array<{ color: string }> }>)?.[0]
        ?.colorStops
      return stops?.[0]?.color.match(/rgba\((\d+,\d+,\d+),/)?.[1]
    }
    expect(rgbOf(strips[0]!)).toBe('0,0,0')
    expect(rgbOf(strips[1]!)).toBe('255,0,0')
  })

  it('clips the container when radius is set and falls back to black', () => {
    const element = EdgeFade({ bottom: 60, mode: 'overlay', radius: 10 } as never)
    expect(element.props.style).toEqual([{}, { borderRadius: 10, overflow: 'hidden' }])
    const strips = stripsOf(element)
    const stops = (
      strips[0]?.[1]?.['backgroundImage'] as Array<{ colorStops: Array<{ color: string }> }>
    )?.[0]?.colorStops
    expect(stops?.[0]?.color).toBe('rgba(0,0,0,1)')
  })
})
