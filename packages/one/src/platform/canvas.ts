import { processColor, type ColorValue, type ViewProps } from 'react-native'
import type { OneNativeStyle } from './generated/controlTypes'
import { unitPoints, type UnitPoint } from './listTypes'

// SwiftUI's Canvas draws with a GraphicsContext inside a closure that cannot cross the
// bridge. React runs the closure with a recording context, in the order SwiftUI would, and
// native replays the recorded operations on the real GraphicsContext (OneNativeCanvasView),
// so SwiftUI rasterises. every value here mirrors its SwiftUI type and every call that
// SwiftUI would reject throws when it is made, with the offending call in the stack.

export interface CanvasPoint {
  x: number
  y: number
}
export interface CanvasSize {
  width: number
  height: number
}
export interface CanvasRect {
  x: number
  y: number
  width: number
  height: number
}

// SwiftUI's Angle. Angle.degrees(90) and Angle.radians(Math.PI / 2) are the same angle.
export class Angle {
  readonly radians: number
  private constructor(radians: number) {
    this.radians = radians
  }
  static radians(radians: number) {
    return new Angle(finite('Angle.radians', radians))
  }
  static degrees(degrees: number) {
    return new Angle((finite('Angle.degrees', degrees) * Math.PI) / 180)
  }
  get degrees() {
    return (this.radians * 180) / Math.PI
  }
}

function finite(owner: string, value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw new Error(`Swift.${owner} needs a finite number, got ${String(value)}`)
  return value
}

function point(owner: string, value: CanvasPoint): CanvasPoint {
  if (value === null || typeof value !== 'object')
    throw new Error(`Swift.${owner} needs a point { x, y }`)
  return { x: finite(`${owner} x`, value.x), y: finite(`${owner} y`, value.y) }
}

function rect(owner: string, value: CanvasRect): CanvasRect {
  if (value === null || typeof value !== 'object')
    throw new Error(`Swift.${owner} needs a rect { x, y, width, height }`)
  return {
    x: finite(`${owner} x`, value.x),
    y: finite(`${owner} y`, value.y),
    width: finite(`${owner} width`, value.width),
    height: finite(`${owner} height`, value.height),
  }
}

function angle(owner: string, value: Angle): number {
  if (!(value instanceof Angle)) throw new Error(`Swift.${owner} needs an Angle`)
  return value.radians
}

export const roundedCornerStyles = ['circular', 'continuous'] as const
export type RoundedCornerStyle = (typeof roundedCornerStyles)[number]

type PathElement =
  | { t: 'move'; x: number; y: number }
  | { t: 'line'; x: number; y: number }
  | { t: 'quad'; x: number; y: number; cx: number; cy: number }
  | { t: 'curve'; x: number; y: number; c1x: number; c1y: number; c2x: number; c2y: number }
  | { t: 'arc'; cx: number; cy: number; r: number; start: number; end: number; clockwise: boolean }
  | { t: 'rect'; x: number; y: number; w: number; h: number }
  | { t: 'roundedRect'; x: number; y: number; w: number; h: number; cw: number; ch: number; style: RoundedCornerStyle }
  | { t: 'ellipse'; x: number; y: number; w: number; h: number }
  | { t: 'close' }

// SwiftUI's Path as a value builder. the builder methods mutate the path and return nothing,
// as Path's mutating methods do; `new Path((path) => { ... })` is Path(_ callback:).
export class Path {
  readonly elements: PathElement[] = []
  private hasCurrentPoint = false

  constructor(build?: (path: Path) => void) {
    if (build !== undefined) {
      if (typeof build !== 'function') throw new Error('Swift.Path takes a function of the path')
      build(this)
    }
  }

  static rect(rect_: CanvasRect) {
    const path = new Path()
    path.addRect(rect_)
    return path
  }
  static ellipse(rect_: CanvasRect) {
    const path = new Path()
    path.addEllipse(rect_)
    return path
  }
  static roundedRect(rect_: CanvasRect, cornerRadius: number, style: RoundedCornerStyle = 'circular') {
    const path = new Path()
    path.addRoundedRect(rect_, { width: cornerRadius, height: cornerRadius }, style)
    return path
  }

  move(to: CanvasPoint) {
    const p = point('Path.move to', to)
    this.elements.push({ t: 'move', x: p.x, y: p.y })
    this.hasCurrentPoint = true
  }

  addLine(to: CanvasPoint) {
    this.requireCurrentPoint('addLine')
    const p = point('Path.addLine to', to)
    this.elements.push({ t: 'line', x: p.x, y: p.y })
  }

  addQuadCurve(to: CanvasPoint, control: CanvasPoint) {
    this.requireCurrentPoint('addQuadCurve')
    const p = point('Path.addQuadCurve to', to)
    const c = point('Path.addQuadCurve control', control)
    this.elements.push({ t: 'quad', x: p.x, y: p.y, cx: c.x, cy: c.y })
  }

  addCurve(to: CanvasPoint, control1: CanvasPoint, control2: CanvasPoint) {
    this.requireCurrentPoint('addCurve')
    const p = point('Path.addCurve to', to)
    const c1 = point('Path.addCurve control1', control1)
    const c2 = point('Path.addCurve control2', control2)
    this.elements.push({ t: 'curve', x: p.x, y: p.y, c1x: c1.x, c1y: c1.y, c2x: c2.x, c2y: c2.y })
  }

  addArc(center: CanvasPoint, radius: number, startAngle: Angle, endAngle: Angle, clockwise: boolean) {
    const c = point('Path.addArc center', center)
    const r = finite('Path.addArc radius', radius)
    if (r < 0) throw new Error('Swift.Path.addArc radius must be zero or more')
    if (typeof clockwise !== 'boolean') throw new Error('Swift.Path.addArc clockwise must be a boolean')
    this.elements.push({
      t: 'arc',
      cx: c.x,
      cy: c.y,
      r,
      start: angle('Path.addArc startAngle', startAngle),
      end: angle('Path.addArc endAngle', endAngle),
      clockwise,
    })
    this.hasCurrentPoint = true
  }

  addRect(rect_: CanvasRect) {
    const r = rect('Path.addRect', rect_)
    this.elements.push({ t: 'rect', x: r.x, y: r.y, w: r.width, h: r.height })
    this.hasCurrentPoint = true
  }

  addRoundedRect(rect_: CanvasRect, cornerSize: CanvasSize, style: RoundedCornerStyle = 'circular') {
    const r = rect('Path.addRoundedRect', rect_)
    const w = finite('Path.addRoundedRect cornerSize width', cornerSize?.width)
    const h = finite('Path.addRoundedRect cornerSize height', cornerSize?.height)
    if (w < 0 || h < 0) throw new Error('Swift.Path.addRoundedRect cornerSize must be zero or more')
    if (!roundedCornerStyles.includes(style))
      throw new Error(`Swift.Path.addRoundedRect style must be one of ${roundedCornerStyles.join(', ')}`)
    this.elements.push({ t: 'roundedRect', x: r.x, y: r.y, w: r.width, h: r.height, cw: w, ch: h, style })
    this.hasCurrentPoint = true
  }

  addEllipse(rect_: CanvasRect) {
    const r = rect('Path.addEllipse', rect_)
    this.elements.push({ t: 'ellipse', x: r.x, y: r.y, w: r.width, h: r.height })
    this.hasCurrentPoint = true
  }

  closeSubpath() {
    this.requireCurrentPoint('closeSubpath')
    this.elements.push({ t: 'close' })
  }

  private requireCurrentPoint(method: string) {
    if (!this.hasCurrentPoint)
      throw new Error(`Swift.Path.${method} needs a current point; call move(to) first`)
  }
}

export interface GradientStop {
  color: ColorValue
  location: number
}
export interface Gradient {
  stops: readonly GradientStop[]
}

// SwiftUI's Gradient(colors:) spaces its colors evenly; Gradient(stops:) places them.
export function Gradient(input: readonly ColorValue[] | { stops: readonly GradientStop[] }): Gradient {
  if (Array.isArray(input)) {
    if (input.length === 0) throw new Error('Swift.Gradient needs at least one color')
    const colors = input as readonly ColorValue[]
    return {
      stops: colors.map((color, index) => ({
        color,
        location: colors.length === 1 ? 0 : index / (colors.length - 1),
      })),
    }
  }
  const stops = (input as { stops?: readonly GradientStop[] })?.stops
  if (!Array.isArray(stops) || stops.length === 0)
    throw new Error('Swift.Gradient needs colors or at least one stop')
  return { stops }
}

function nativeColor(owner: string, color: ColorValue): number {
  const processed = processColor(color)
  if (typeof processed !== 'number') throw new Error(`Swift.${owner} must be a color string or number`)
  return processed
}

function nativeGradient(owner: string, gradient: Gradient) {
  if (gradient === null || typeof gradient !== 'object' || !Array.isArray(gradient.stops) || gradient.stops.length === 0)
    throw new Error(`Swift.${owner} needs a Gradient with at least one stop`)
  return gradient.stops.map((stop, index) => {
    const location = finite(`${owner} stop ${index} location`, stop.location)
    if (location < 0 || location > 1)
      throw new Error(`Swift.${owner} stop ${index} location must be between 0 and 1`)
    return { color: nativeColor(`${owner} stop ${index} color`, stop.color), location }
  })
}

type ShadingValue =
  | { kind: 'color'; color: ColorValue }
  | { kind: 'linearGradient'; gradient: Gradient; startPoint: CanvasPoint; endPoint: CanvasPoint }
  | { kind: 'radialGradient'; gradient: Gradient; center: CanvasPoint; startRadius: number; endRadius: number }
  | { kind: 'conicGradient'; gradient: Gradient; center: CanvasPoint; angle: Angle }

// GraphicsContext.Shading: how a fill, stroke or symbol is painted. gradient points are in
// the canvas's own coordinates, as SwiftUI's are.
export const Shading = {
  color(color: ColorValue): ShadingValue {
    return { kind: 'color', color }
  },
  linearGradient(gradient: Gradient, startPoint: CanvasPoint, endPoint: CanvasPoint): ShadingValue {
    return { kind: 'linearGradient', gradient, startPoint, endPoint }
  },
  radialGradient(gradient: Gradient, center: CanvasPoint, startRadius: number, endRadius: number): ShadingValue {
    return { kind: 'radialGradient', gradient, center, startRadius, endRadius }
  },
  conicGradient(gradient: Gradient, center: CanvasPoint, angle_: Angle = Angle.radians(0)): ShadingValue {
    return { kind: 'conicGradient', gradient, center, angle: angle_ }
  },
}
export type Shading = ShadingValue

function nativeShading(owner: string, shading: Shading) {
  if (shading === null || typeof shading !== 'object')
    throw new Error(`Swift.${owner} needs a Shading, such as Shading.color(...)`)
  if (shading.kind === 'color') return { kind: 'color', color: nativeColor(`${owner} color`, shading.color) }
  if (shading.kind === 'linearGradient')
    return {
      kind: 'linearGradient',
      stops: nativeGradient(owner, shading.gradient),
      start: point(`${owner} startPoint`, shading.startPoint),
      end: point(`${owner} endPoint`, shading.endPoint),
    }
  if (shading.kind === 'radialGradient') {
    const startRadius = finite(`${owner} startRadius`, shading.startRadius)
    const endRadius = finite(`${owner} endRadius`, shading.endRadius)
    if (startRadius < 0 || endRadius < 0) throw new Error(`Swift.${owner} radii must be zero or more`)
    return {
      kind: 'radialGradient',
      stops: nativeGradient(owner, shading.gradient),
      center: point(`${owner} center`, shading.center),
      startRadius,
      endRadius,
    }
  }
  if (shading.kind === 'conicGradient')
    return {
      kind: 'conicGradient',
      stops: nativeGradient(owner, shading.gradient),
      center: point(`${owner} center`, shading.center),
      angle: angle(`${owner} angle`, shading.angle),
    }
  throw new Error(`Swift.${owner} has an unknown shading`)
}

export interface FillStyle {
  eoFill?: boolean
  antialiased?: boolean
}

export const lineCaps = ['butt', 'round', 'square'] as const
export const lineJoins = ['miter', 'round', 'bevel'] as const
export interface StrokeStyle {
  lineWidth?: number
  lineCap?: (typeof lineCaps)[number]
  lineJoin?: (typeof lineJoins)[number]
  miterLimit?: number
  dash?: readonly number[]
  dashPhase?: number
}

function nativeFillStyle(owner: string, style: FillStyle | undefined) {
  const eoFill = style?.eoFill ?? false
  const antialiased = style?.antialiased ?? true
  if (typeof eoFill !== 'boolean' || typeof antialiased !== 'boolean')
    throw new Error(`Swift.${owner} style eoFill and antialiased must be booleans`)
  return { eoFill, antialiased }
}

function nativeStrokeStyle(owner: string, style: number | StrokeStyle | undefined) {
  const input: StrokeStyle = typeof style === 'number' ? { lineWidth: style } : (style ?? {})
  const lineWidth = input.lineWidth === undefined ? 1 : finite(`${owner} lineWidth`, input.lineWidth)
  if (lineWidth < 0) throw new Error(`Swift.${owner} lineWidth must be zero or more`)
  const lineCap = input.lineCap ?? 'butt'
  if (!lineCaps.includes(lineCap)) throw new Error(`Swift.${owner} lineCap must be one of ${lineCaps.join(', ')}`)
  const lineJoin = input.lineJoin ?? 'miter'
  if (!lineJoins.includes(lineJoin))
    throw new Error(`Swift.${owner} lineJoin must be one of ${lineJoins.join(', ')}`)
  const miterLimit = input.miterLimit === undefined ? 10 : finite(`${owner} miterLimit`, input.miterLimit)
  const dash = input.dash ?? []
  if (!Array.isArray(dash)) throw new Error(`Swift.${owner} dash must be an array of lengths`)
  for (const length of dash) {
    if (finite(`${owner} dash length`, length) < 0)
      throw new Error(`Swift.${owner} dash lengths must be zero or more`)
  }
  const dashPhase = input.dashPhase === undefined ? 0 : finite(`${owner} dashPhase`, input.dashPhase)
  return { lineWidth, lineCap, lineJoin, miterLimit, dash: [...dash], dashPhase }
}

export const canvasFontWeights = [
  'ultraLight',
  'thin',
  'light',
  'regular',
  'medium',
  'semibold',
  'bold',
  'heavy',
  'black',
] as const
export interface CanvasText {
  text: string
  fontSize?: number
  fontWeight?: (typeof canvasFontWeights)[number]
  color?: ColorValue
}
export interface CanvasSymbol {
  systemName: string
  color?: ColorValue
}

export const blendModes = [
  'normal',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'colorDodge',
  'colorBurn',
  'softLight',
  'hardLight',
  'difference',
  'exclusion',
  'hue',
  'saturation',
  'color',
  'luminosity',
  'clear',
  'copy',
  'sourceIn',
  'sourceOut',
  'sourceAtop',
  'destinationOver',
  'destinationIn',
  'destinationOut',
  'destinationAtop',
  'xor',
  'plusDarker',
  'plusLighter',
] as const
export type BlendMode = (typeof blendModes)[number]

type DrawPlacement = { at: CanvasPoint; anchor?: UnitPoint } | { in: CanvasRect }

function nativeUnitPoint(owner: string, anchor: UnitPoint): CanvasPoint {
  if (typeof anchor === 'string') {
    if (!Object.hasOwn(unitPoints, anchor)) throw new Error(`Swift.${owner} anchor ${anchor} is not a UnitPoint`)
    return { ...unitPoints[anchor] }
  }
  return point(`${owner} anchor`, anchor)
}

// GraphicsContext, recorded. fill, stroke, draw and clip take effect in the order called;
// translateBy, scaleBy, rotate, opacity and blendMode change the state later calls draw
// with, and drawLayer draws into a copy of that state, as in SwiftUI.
export interface GraphicsContext {
  fill(path: Path, shading: Shading, style?: FillStyle): void
  stroke(path: Path, shading: Shading, style?: number | StrokeStyle): void
  draw(item: CanvasText | CanvasSymbol, placement: DrawPlacement): void
  clip(path: Path, style?: FillStyle): void
  translateBy(x: number, y: number): void
  scaleBy(x: number, y: number): void
  rotate(by: Angle): void
  opacity: number
  blendMode: BlendMode
  drawLayer(draw: (context: GraphicsContext) => void): void
}

type CanvasOperation = Record<string, unknown>

function nativePath(owner: string, path: Path): PathElement[] {
  if (!(path instanceof Path)) throw new Error(`Swift.${owner} needs a Path`)
  return path.elements
}

function recordingContext(ops: CanvasOperation[]): GraphicsContext {
  let opacity = 1
  let blendMode: BlendMode = 'normal'
  const context: GraphicsContext = {
    fill(path, shading, style) {
      ops.push({
        op: 'fill',
        path: nativePath('GraphicsContext.fill', path),
        shading: nativeShading('GraphicsContext.fill shading', shading),
        style: nativeFillStyle('GraphicsContext.fill', style),
      })
    },
    stroke(path, shading, style) {
      ops.push({
        op: 'stroke',
        path: nativePath('GraphicsContext.stroke', path),
        shading: nativeShading('GraphicsContext.stroke shading', shading),
        style: nativeStrokeStyle('GraphicsContext.stroke', style),
      })
    },
    draw(item, placement) {
      const owner = 'GraphicsContext.draw'
      let nativeItem: Record<string, unknown>
      if (item !== null && typeof item === 'object' && 'text' in item) {
        if (typeof item.text !== 'string') throw new Error(`Swift.${owner} text must be a string`)
        if (item.fontSize !== undefined && finite(`${owner} fontSize`, item.fontSize) <= 0)
          throw new Error(`Swift.${owner} fontSize must be more than zero`)
        if (item.fontWeight !== undefined && !canvasFontWeights.includes(item.fontWeight))
          throw new Error(`Swift.${owner} fontWeight must be one of ${canvasFontWeights.join(', ')}`)
        nativeItem = {
          kind: 'text',
          text: item.text,
          fontSize: item.fontSize ?? -1,
          fontWeight: item.fontWeight ?? 'regular',
          ...(item.color === undefined ? {} : { color: nativeColor(`${owner} color`, item.color) }),
        }
      } else if (item !== null && typeof item === 'object' && 'systemName' in item) {
        if (typeof item.systemName !== 'string' || !item.systemName)
          throw new Error(`Swift.${owner} systemName must be an SF Symbol name`)
        nativeItem = {
          kind: 'symbol',
          systemName: item.systemName,
          ...(item.color === undefined ? {} : { color: nativeColor(`${owner} color`, item.color) }),
        }
      } else throw new Error(`Swift.${owner} draws text { text } or a symbol { systemName }`)
      if (placement === null || typeof placement !== 'object')
        throw new Error(`Swift.${owner} needs { at, anchor? } or { in }`)
      if ('in' in placement) {
        ops.push({ op: 'draw', item: nativeItem, in: rect(`${owner} in`, placement.in) })
      } else if ('at' in placement) {
        ops.push({
          op: 'draw',
          item: nativeItem,
          at: point(`${owner} at`, placement.at),
          anchor: nativeUnitPoint(owner, placement.anchor ?? 'center'),
        })
      } else throw new Error(`Swift.${owner} needs { at, anchor? } or { in }`)
    },
    clip(path, style) {
      ops.push({
        op: 'clip',
        path: nativePath('GraphicsContext.clip', path),
        style: nativeFillStyle('GraphicsContext.clip', style),
      })
    },
    translateBy(x, y) {
      ops.push({
        op: 'translate',
        x: finite('GraphicsContext.translateBy x', x),
        y: finite('GraphicsContext.translateBy y', y),
      })
    },
    scaleBy(x, y) {
      ops.push({
        op: 'scale',
        x: finite('GraphicsContext.scaleBy x', x),
        y: finite('GraphicsContext.scaleBy y', y),
      })
    },
    rotate(by) {
      ops.push({ op: 'rotate', radians: angle('GraphicsContext.rotate by', by) })
    },
    get opacity() {
      return opacity
    },
    set opacity(value: number) {
      const next = finite('GraphicsContext.opacity', value)
      if (next < 0 || next > 1) throw new Error('Swift.GraphicsContext.opacity must be between 0 and 1')
      opacity = next
      ops.push({ op: 'opacity', value: next })
    },
    get blendMode() {
      return blendMode
    },
    set blendMode(value: BlendMode) {
      if (!blendModes.includes(value))
        throw new Error(`Swift.GraphicsContext.blendMode must be one of ${blendModes.join(', ')}`)
      blendMode = value
      ops.push({ op: 'blendMode', mode: value })
    },
    drawLayer(draw) {
      if (typeof draw !== 'function') throw new Error('Swift.GraphicsContext.drawLayer takes a function of the layer context')
      const layerOps: CanvasOperation[] = []
      const layer = recordingContext(layerOps)
      // the layer starts from the state the context has, as SwiftUI's copy does.
      layer.opacity = opacity
      layer.blendMode = blendMode
      layerOps.length = 0
      draw(layer)
      ops.push({ op: 'layer', ops: layerOps })
    },
  }
  return context
}

// the operations the closure recorded for a canvas of this size, as native's JSON.
export function recordCanvas(
  draw: (context: GraphicsContext, size: CanvasSize) => void,
  size: CanvasSize
): string {
  const ops: CanvasOperation[] = []
  draw(recordingContext(ops), size)
  return JSON.stringify(ops)
}

export const canvasColorModes = ['nonLinear', 'linear', 'extendedLinear'] as const
export type CanvasColorMode = (typeof canvasColorModes)[number]

// SwiftUI's Canvas(opaque:colorMode:rendersAsynchronously:renderer:). the canvas fills the
// box it is given, as SwiftUI's does; give it a height. the function child is the renderer:
// it runs with the context and the canvas size once native has laid the canvas out, and runs
// again when the size or React state it reads changes.
export interface CanvasProps extends Omit<ViewProps, 'children'> {
  swiftStyle?: OneNativeStyle
  opaque?: boolean
  colorMode?: CanvasColorMode
  rendersAsynchronously?: boolean
  children: (context: GraphicsContext, size: CanvasSize) => void
}
