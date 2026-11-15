import { createElement } from 'react'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'
import { Swift as UnsupportedSwift } from '../src/platform/unsupported'
import { Angle, Gradient, Path, Shading, recordCanvas } from '../src/platform/canvas'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// same stub setup as mapControls.test.tsx. the reader reads hooks, so every
// case mounts through the renderer and drives the private native event the
// way the map suite drives its slot props.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  Text: () => null,
  Image: () => null,
  processColor: (color: unknown) => (color === 'red' ? 0xffff0000 : color === 'blue' ? 0xff0000ff : undefined),
  ScrollView: () => null,
  TextInput: () => null,
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => {
    const Stub = (_props: unknown) => null
    Stub.displayName = name
    return Stub
  },
}))

let Containers: typeof import('../src/platform/Containers.native')

beforeAll(async () => {
  Containers = await import('../src/platform/Containers.native')
})

const root = fileURLToPath(new URL('..', import.meta.url))
const schema = JSON.parse(readFileSync(root + 'schema.json', 'utf8'))
const metadata = JSON.parse(readFileSync(root + 'package.json', 'utf8'))
const component = (publicName: string) =>
  schema.components.find(
    (entry: { publicName: string }) => entry.publicName === publicName
  )

function stubOf(root: ReturnType<typeof create>, name: string) {
  return root.root.find(
    (node) => (node.type as { displayName?: string })?.displayName === name
  )
}


const ops = (draw: (context: never, size: { width: number; height: number }) => void) =>
  JSON.parse(recordCanvas(draw as never, { width: 100, height: 50 }))

const square = () => {
  const path = new Path()
  path.addRect({ x: 0, y: 0, width: 10, height: 10 })
  return path
}

function renderCanvas(props: Record<string, unknown>) {
  let rendered: ReturnType<typeof create> | undefined
  act(() => {
    rendered = create(createElement(Containers.Canvas, props as never) as never)
  })
  return rendered!
}

const canvas = (rendered: ReturnType<typeof create>) => stubOf(rendered, 'OneNativeCanvas')

describe('canvas recording', () => {
  it('records fill, stroke and clip with their shading and styles in call order', () => {
    const recorded = ops((context: any, size) => {
      const path = new Path((p) => {
        p.move({ x: 1, y: 2 })
        p.addLine({ x: size.width, y: 2 })
        p.addQuadCurve({ x: 5, y: 6 }, { x: 3, y: 4 })
        p.addCurve({ x: 9, y: 9 }, { x: 6, y: 7 }, { x: 7, y: 8 })
        p.addArc({ x: 5, y: 5 }, 3, Angle.degrees(0), Angle.degrees(180), true)
        p.closeSubpath()
      })
      context.fill(path, Shading.color('red'))
      context.stroke(path, Shading.color('blue'), { lineWidth: 2, lineCap: 'round', dash: [4, 2] })
      context.clip(square(), { eoFill: true })
    })
    expect(recorded.map((op: { op: string }) => op.op)).toEqual(['fill', 'stroke', 'clip'])
    expect(recorded[0].path.map((e: { t: string }) => e.t)).toEqual(['move', 'line', 'quad', 'curve', 'arc', 'close'])
    expect(recorded[0].path[1]).toEqual({ t: 'line', x: 100, y: 2 })
    expect(recorded[0].path[4].end).toBeCloseTo(Math.PI)
    expect(recorded[0].shading).toEqual({ kind: 'color', color: 0xffff0000 })
    expect(recorded[0].style).toEqual({ eoFill: false, antialiased: true })
    expect(recorded[1].style).toEqual({
      lineWidth: 2,
      lineCap: 'round',
      lineJoin: 'miter',
      miterLimit: 10,
      dash: [4, 2],
      dashPhase: 0,
    })
    expect(recorded[2].style.eoFill).toBe(true)
  })

  it('records state changes, text, symbols, gradients and layers', () => {
    const recorded = ops((context: any) => {
      context.translateBy(5, 6)
      context.scaleBy(2, 3)
      context.rotate(Angle.degrees(90))
      context.opacity = 0.5
      context.blendMode = 'multiply'
      context.draw({ text: 'hi', fontSize: 12, fontWeight: 'bold', color: 'red' }, { at: { x: 1, y: 2 }, anchor: 'topLeading' })
      context.draw({ systemName: 'star.fill' }, { in: { x: 0, y: 0, width: 4, height: 4 } })
      context.fill(
        square(),
        Shading.linearGradient(Gradient(['red', 'blue']), { x: 0, y: 0 }, { x: 10, y: 0 })
      )
      context.drawLayer((layer: any) => layer.fill(square(), Shading.color('blue')))
    })
    expect(recorded.map((op: { op: string }) => op.op)).toEqual([
      'translate', 'scale', 'rotate', 'opacity', 'blendMode', 'draw', 'draw', 'fill', 'layer',
    ])
    expect(recorded[2].radians).toBeCloseTo(Math.PI / 2)
    expect(recorded[5]).toMatchObject({
      item: { kind: 'text', text: 'hi', fontSize: 12, fontWeight: 'bold', color: 0xffff0000 },
      at: { x: 1, y: 2 },
      anchor: { x: 0, y: 0 },
    })
    expect(recorded[6]).toMatchObject({ item: { kind: 'symbol', systemName: 'star.fill' }, in: { width: 4 } })
    expect(recorded[7].shading.stops).toEqual([
      { color: 0xffff0000, location: 0 },
      { color: 0xff0000ff, location: 1 },
    ])
    expect(recorded[8].ops).toEqual([
      { op: 'fill', path: square().elements, shading: { kind: 'color', color: 0xff0000ff }, style: { eoFill: false, antialiased: true } },
    ])
  })

  it('rejects what SwiftUI would reject', () => {
    const run = (draw: (context: any) => void) => () => ops(draw as never)
    expect(run((c) => c.fill({}, Shading.color('red')))).toThrow('needs a Path')
    expect(run((c) => c.fill(square(), 'red'))).toThrow('needs a Shading')
    expect(run((c) => c.fill(square(), Shading.color('nope')))).toThrow('must be a color')
    expect(run((c) => c.stroke(square(), Shading.color('red'), { lineWidth: -1 }))).toThrow('lineWidth must be zero or more')
    expect(run((c) => c.stroke(square(), Shading.color('red'), { lineCap: 'flat' }))).toThrow('lineCap must be one of')
    expect(run((c) => c.stroke(square(), Shading.color('red'), { dash: [-1] }))).toThrow('dash lengths')
    expect(run((c) => c.translateBy(Number.NaN, 0))).toThrow('finite number')
    expect(run((c) => c.rotate(90))).toThrow('needs an Angle')
    expect(run((c) => { c.opacity = 2 })).toThrow('between 0 and 1')
    expect(run((c) => { c.blendMode = 'bogus' })).toThrow('blendMode must be one of')
    expect(run((c) => c.draw({ text: 'x', fontSize: 0 }, { at: { x: 0, y: 0 } }))).toThrow('fontSize')
    expect(run((c) => c.draw({ text: 'x' }, {}))).toThrow('needs { at, anchor? } or { in }')
    expect(run((c) => c.draw({ other: 1 }, { at: { x: 0, y: 0 } }))).toThrow('draws text')
    expect(run((c) => c.draw({ text: 'x' }, { at: { x: 0, y: 0 }, anchor: 'nowhere' }))).toThrow('not a UnitPoint')
    expect(run((c) => c.fill(square(), Shading.radialGradient(Gradient(['red']), { x: 0, y: 0 }, -1, 2)))).toThrow('radii')
    expect(() => Gradient([])).toThrow('at least one color')
    expect(run((c) => c.fill(square(), Shading.color('red'), { eoFill: 1 }))).toThrow('booleans')
    expect(run((c) => c.drawLayer(null))).toThrow('takes a function')
  })

  it('rejects path calls SwiftUI would reject', () => {
    expect(() => new Path().addLine({ x: 1, y: 1 })).toThrow('needs a current point')
    expect(() => new Path().closeSubpath()).toThrow('needs a current point')
    expect(() => new Path().move({ x: Number.POSITIVE_INFINITY, y: 0 })).toThrow('finite number')
    expect(() => new Path().addArc({ x: 0, y: 0 }, -1, Angle.degrees(0), Angle.degrees(1), true)).toThrow('radius')
    expect(() => new Path().addRoundedRect({ x: 0, y: 0, width: 1, height: 1 }, { width: -1, height: 1 })).toThrow('cornerSize')
    expect(() => new Path().addRoundedRect({ x: 0, y: 0, width: 1, height: 1 }, { width: 1, height: 1 }, 'round' as never)).toThrow('style must be')
    expect(() => Angle.degrees(Number.NaN)).toThrow('finite number')
    const path = new Path()
    path.addEllipse({ x: 0, y: 0, width: 4, height: 2 })
    path.addLine({ x: 1, y: 1 })
    expect(path.elements.map((e) => e.t)).toEqual(['ellipse', 'line'])
    expect(Path.roundedRect({ x: 0, y: 0, width: 4, height: 4 }, 1).elements[0]).toMatchObject({ t: 'roundedRect', cw: 1, ch: 1, style: 'circular' })
  })
})

describe('canvas', () => {
  it('draws nothing until native reports its size, then records for that size', () => {
    const sizes: unknown[] = []
    const rendered = renderCanvas({
      children: (context: any, size: unknown) => {
        sizes.push(size)
        context.fill(square(), Shading.color('red'))
      },
    })
    expect(canvas(rendered).props.ops).toBe('[]')
    expect(sizes).toEqual([])
    act(() => {
      canvas(rendered).props.onNativeCanvasSizeChange({ nativeEvent: { width: 30, height: 20 } })
    })
    expect(sizes).toEqual([{ width: 30, height: 20 }])
    expect(JSON.parse(canvas(rendered).props.ops)).toHaveLength(1)
    expect(canvas(rendered).props.opaque).toBe(false)
    expect(canvas(rendered).props.colorMode).toBe('nonLinear')
    expect(canvas(rendered).props.rendersAsynchronously).toBe(false)
  })

  it('does not run the renderer again for the same size', () => {
    let runs = 0
    const rendered = renderCanvas({ children: () => void runs++ })
    const send = (width: number) =>
      act(() => {
        canvas(rendered).props.onNativeCanvasSizeChange({ nativeEvent: { width, height: 10 } })
      })
    send(30)
    send(30)
    expect(runs).toBe(1)
    send(31)
    expect(runs).toBe(2)
  })

  it('rejects a bad renderer, option or size', () => {
    expect(() => renderCanvas({ children: 'x' })).toThrow('takes a render function')
    expect(() => renderCanvas({ children: () => {}, opaque: 'yes' })).toThrow('must be booleans')
    expect(() => renderCanvas({ children: () => {}, colorMode: 'p3' })).toThrow('colorMode must be one of')
    const rendered = renderCanvas({ children: () => {} })
    expect(() =>
      act(() => {
        canvas(rendered).props.onNativeCanvasSizeChange({ nativeEvent: { width: -1, height: 1 } })
      })
    ).toThrow('invalid size')
  })

  it('throws without the native build', () => {
    expect(() => (UnsupportedSwift as Record<string, (props: object) => unknown>).Canvas({})).toThrow(
      'Swift.Canvas requires an iOS native build'
    )
    expect(UnsupportedSwift.Path).toBe(Path)
  })
})

describe('canvas schema', () => {
  it('carries the ops transport, the size event and no slots', () => {
    expect(component('Canvas').props).toMatchObject({
      ops: { type: 'string' },
      opaque: { type: 'boolean' },
      colorMode: { type: 'string' },
      rendersAsynchronously: { type: 'boolean' },
    })
    expect(component('Canvas').slots).toEqual([])
    expect(component('Canvas').interfaceOnly).toBe(false)
    expect(metadata.codegenConfig.ios.componentProvider.OneNativeCanvas).toBe('OneNativeCanvasComponentView')
  })
})
