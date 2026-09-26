import type { CSSProperties } from 'react'
import type { ColorValue } from 'react-native'
import { sampleCurve } from './curves'
import { flattenStyle, resolveEdges, resolveRadius, type ResolvedEdge } from './normalize'
import type { EdgeFadeProps } from './types'

// the web draws every mode with css gradients sampled from the same curves
// the native tables use, so a curve reads the same on every platform. mask
// mode intersects one mask-image gradient per edge, overlay mode paints a
// color strip per edge, and blur mode puts a backdrop-filter strip per edge
// whose own mask ramps the blur along the curve. it renders plain divs and
// never touches react-native, so no web bundle pulls react-native-web in.

type EdgeName = 'top' | 'bottom' | 'left' | 'right'

const EDGES: EdgeName[] = ['top', 'bottom', 'left', 'right']

const DIRECTIONS: Record<EdgeName, string> = {
  top: 'to bottom',
  bottom: 'to top',
  left: 'to right',
  right: 'to left',
}

// outer-to-inner stops across the fade depth, in px. `paint(visible)` maps
// the curve's visibility (1 inner, 0 outer) to the stop's paint.
function curveStops(edge: ResolvedEdge, paint: (visible: number) => string) {
  const alphas = sampleCurve(edge.curve)
  const last = alphas.length - 1
  return alphas.map((_, index) => {
    const visible = alphas[last - index] ?? 0
    return `${paint(visible)} ${((index / last) * edge.size).toFixed(2)}px`
  })
}

function edgeMask(name: EdgeName, edge: ResolvedEdge) {
  const stops = curveStops(edge, (visible) => `rgba(0,0,0,${visible})`)
  return `linear-gradient(${DIRECTIONS[name]}, ${stops.join(', ')}, black ${edge.size}px)`
}

// the box a react native View lays out as, so style props mean the same thing.
const VIEW_BASE: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  position: 'relative',
  boxSizing: 'border-box',
  minWidth: 0,
  minHeight: 0,
}

// strips never take touches.
function stripLayout(name: EdgeName, size: number): CSSProperties {
  const depth = Math.max(0, size)
  const base = { position: 'absolute' as const, pointerEvents: 'none' as const }
  switch (name) {
    case 'top':
      return { ...base, top: 0, left: 0, right: 0, height: depth }
    case 'bottom':
      return { ...base, bottom: 0, left: 0, right: 0, height: depth }
    case 'left':
      return { ...base, top: 0, bottom: 0, left: 0, width: depth }
    case 'right':
      return { ...base, top: 0, bottom: 0, right: 0, width: depth }
  }
}

// a strip's gradient runs across its own box, so stops are percentages of it.
function stripGradient(
  name: EdgeName,
  edge: ResolvedEdge,
  paint: (visible: number) => string
) {
  const alphas = sampleCurve(edge.curve)
  const last = alphas.length - 1
  const stops = alphas.map((_, index) => {
    const visible = alphas[last - index] ?? 0
    return `${paint(visible)} ${((index / last) * 100).toFixed(2)}%`
  })
  return `linear-gradient(${DIRECTIONS[name]}, ${stops.join(', ')})`
}

// the color at the outer edge easing to transparent at the inner edge, with
// the color's own alpha as the ceiling.
function colorPaint(color: ColorValue) {
  return (visible: number) =>
    `color-mix(in srgb, ${String(color)} ${((1 - visible) * 100).toFixed(2)}%, transparent)`
}

// the page's direction decides start and end; server renders are ltr.
function documentIsRTL() {
  return typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
}

export function EdgeFade(props: EdgeFadeProps) {
  const resolved = resolveEdges(props, documentIsRTL())
  const {
    top: _top,
    bottom: _bottom,
    left: _left,
    right: _right,
    start: _start,
    end: _end,
    size: _size,
    curve: _curve,
    mode: _mode,
    color: _color,
    blurRadius: _blurRadius,
    frostProgression: _frostProgression,
    radius,
    style,
    children,
    testID,
    nativeID,
  } = props
  // a View style is layout css; react-dom adds px to its bare numbers.
  const { borderRadius: styleRadius, ...cleanStyle } = flattenStyle(style)
  const resolvedRadius = resolveRadius(radius, styleRadius)
  const box: CSSProperties = {
    ...VIEW_BASE,
    ...cleanStyle,
    ...(resolvedRadius != null && { borderRadius: resolvedRadius, overflow: 'hidden' }),
  }
  const hostProps = { 'data-testid': testID, id: nativeID }
  const edges = EDGES.flatMap((name) => {
    const edge = resolved[name]
    return edge ? [{ name, edge }] : []
  })

  if (resolved.mode === 'mask') {
    const maskImage = edges.map(({ name, edge }) => edgeMask(name, edge)).join(', ')
    const maskStyle: CSSProperties = edges.length
      ? { maskImage, maskComposite: 'intersect', maskRepeat: 'no-repeat' }
      : {}
    return (
      <div {...hostProps} style={{ ...box, ...maskStyle }}>
        {children}
      </div>
    )
  }

  if (resolved.mode === 'overlay') {
    // explicit overlay without a color falls back to black, as on native.
    const fallback = resolved.color ?? 'black'
    return (
      <div {...hostProps} style={box}>
        {children}
        {edges.map(({ name, edge }) => (
          <div
            key={name}
            style={{
              ...stripLayout(name, edge.size),
              backgroundImage: stripGradient(
                name,
                edge,
                colorPaint(edge.color ?? fallback)
              ),
            }}
          />
        ))}
      </div>
    )
  }

  // blur: each strip blurs what sits behind it, ramped from sharp at the inner
  // edge to blurRadius at the outer edge by a mask over the strip, reaching
  // full strength frostProgression of the way out.
  const veil = resolved.color
  return (
    <div {...hostProps} style={box}>
      {children}
      {edges.map(({ name, edge }) => {
        const reach = resolved.frostProgression
        const blurMask = stripGradient(name, edge, (visible) => {
          const strength = Math.min(1, (1 - visible) / reach)
          return `rgba(0,0,0,${strength.toFixed(4)})`
        })
        return (
          <div
            key={name}
            style={{
              ...stripLayout(name, edge.size),
              backdropFilter: `blur(${resolved.blurRadius}px)`,
              maskImage: blurMask,
              backgroundImage: veil
                ? stripGradient(name, edge, colorPaint(veil))
                : undefined,
            }}
          />
        )
      })}
    </div>
  )
}
