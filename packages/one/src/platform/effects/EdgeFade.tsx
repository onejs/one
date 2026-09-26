import { StyleSheet, View, type ColorValue, type ViewStyle } from 'react-native'
import { sampleCurve } from './curves'
import { resolveEdges, resolveRadius, type ResolvedEdge } from './normalize'
import type { EdgeFadeProps } from './types'

// the web draws every mode with css gradients sampled from the same curves
// the native tables use, so a curve reads the same on every platform. mask
// mode intersects one mask-image gradient per edge, overlay mode paints a
// color strip per edge, and blur mode puts a backdrop-filter strip per edge
// whose own mask ramps the blur along the curve.

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

// strips never take touches; react-native-web reads pointerEvents from style.
function stripLayout(name: EdgeName, size: number) {
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
function stripGradient(name: EdgeName, edge: ResolvedEdge, paint: (visible: number) => string) {
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

// react-native-web hands css it does not know (masks, backdrop filters,
// gradient strings) straight to the dom. react native's style types do not
// list those keys, so the merged style is typed here once.
function webStyle(...parts: (Record<string, unknown> | null)[]): ViewStyle {
  return Object.assign({}, ...parts) as ViewStyle
}

export function EdgeFade(props: EdgeFadeProps) {
  const resolved = resolveEdges(props)
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
    ...viewProps
  } = props
  const { borderRadius: _ignored, ...cleanStyle } = (StyleSheet.flatten(style) ?? {}) as Record<
    string,
    unknown
  >
  const resolvedRadius = resolveRadius(radius, style)
  const radiusStyle =
    resolvedRadius != null ? { borderRadius: resolvedRadius, overflow: 'hidden' as const } : null
  const edges = EDGES.flatMap((name) => {
    const edge = resolved[name]
    return edge ? [{ name, edge }] : []
  })

  if (resolved.mode === 'mask') {
    const maskImage = edges.map(({ name, edge }) => edgeMask(name, edge)).join(', ')
    const maskStyle = edges.length
      ? { maskImage, maskComposite: 'intersect', maskRepeat: 'no-repeat' }
      : null
    return (
      <View {...viewProps} style={webStyle(cleanStyle, radiusStyle, maskStyle)}>
        {children}
      </View>
    )
  }

  if (resolved.mode === 'overlay') {
    // explicit overlay without a color falls back to black, as on native.
    const fallback = resolved.color ?? 'black'
    return (
      <View {...viewProps} style={webStyle(cleanStyle, radiusStyle)}>
        {children}
        {edges.map(({ name, edge }) => (
          <View
            key={name}
            style={webStyle(stripLayout(name, edge.size), {
              backgroundImage: stripGradient(name, edge, colorPaint(edge.color ?? fallback)),
            })}
          />
        ))}
      </View>
    )
  }

  // blur: each strip blurs what sits behind it, ramped from sharp at the inner
  // edge to blurRadius at the outer edge by a mask over the strip, reaching
  // full strength frostProgression of the way out.
  const veil = resolved.color
  return (
    <View {...viewProps} style={webStyle(cleanStyle, radiusStyle)}>
      {children}
      {edges.map(({ name, edge }) => {
        const reach = resolved.frostProgression
        const blurMask = stripGradient(name, edge, (visible) => {
          const strength = Math.min(1, (1 - visible) / reach)
          return `rgba(0,0,0,${strength.toFixed(4)})`
        })
        return (
          <View
            key={name}
            style={webStyle(stripLayout(name, edge.size), {
              backdropFilter: `blur(${resolved.blurRadius}px)`,
              maskImage: blurMask,
              backgroundImage: veil ? stripGradient(name, edge, colorPaint(veil)) : undefined,
            })}
          />
        )
      })}
    </View>
  )
}
