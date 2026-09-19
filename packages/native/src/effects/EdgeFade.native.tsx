import { StyleSheet, View, processColor, type ColorValue } from 'react-native'
import NativeEdgeFade from '../specs/OneNativeEdgeFadeNativeComponent'
import { sampleCurve } from './curves'
import { resolveEdges, resolveNativeProps, resolveRadius, type ResolvedEdge } from './normalize'
import type { EdgeFadeProps } from './types'

// overlay fades paint through RN core backgroundImage gradients (no native
// code). the stable key is promoted in 0.87, the integration target; 0.86
// only processes the experimental alias, so this is 0.87+.
const BACKGROUND_IMAGE_KEY = 'backgroundImage' as const

type EdgeName = 'top' | 'bottom' | 'left' | 'right'

const STRIP_DIRECTIONS: Record<EdgeName, 'to bottom' | 'to top' | 'to right' | 'to left'> = {
  top: 'to bottom',
  bottom: 'to top',
  left: 'to right',
  right: 'to left',
}

function stripLayout(edge: EdgeName, size: number) {
  const clamped = Math.max(0, size)
  switch (edge) {
    case 'top':
      return { position: 'absolute' as const, top: 0, left: 0, right: 0, height: clamped }
    case 'bottom':
      return { position: 'absolute' as const, bottom: 0, left: 0, right: 0, height: clamped }
    case 'left':
      return { position: 'absolute' as const, top: 0, bottom: 0, left: 0, width: clamped }
    case 'right':
      return { position: 'absolute' as const, top: 0, bottom: 0, right: 0, width: clamped }
  }
}

// sample the edge curve outer-to-inner into core gradient stops: opaque
// color at the outer edge easing to transparent at the inner edge, with
// the input color's own alpha as the ceiling.
function stripGradient(edge: EdgeName, resolved: ResolvedEdge, fallback: ColorValue) {
  // processColor resolves any ColorValue (names, hex, numbers) to 0xAARRGGBB;
  // stops go back out as rgba() strings, the ColorValue form core types.
  // opaque platform colors have no readable channels, so they fall back to
  // black rather than guessing.
  const processed = processColor(resolved.color ?? fallback)
  const argb = typeof processed === 'number' ? processed : 0xff000000
  const red = (argb >> 16) & 0xff
  const green = (argb >> 8) & 0xff
  const blue = argb & 0xff
  const ceiling = ((argb >>> 24) & 0xff) / 255
  const alphas = sampleCurve(resolved.curve)
  const last = alphas.length - 1
  return {
    type: 'linear-gradient' as const,
    direction: STRIP_DIRECTIONS[edge],
    colorStops: alphas.map((_, index) => {
      const alpha = alphas[last - index] ?? 0
      const stopAlpha = Math.max(0, Math.min(1, (1 - alpha) * ceiling))
      return {
        color: `rgba(${red},${green},${blue},${Number(stopAlpha.toFixed(4))})`,
        positions: [`${((index / last) * 100).toFixed(2)}%`],
      }
    }),
  }
}

function OverlayStrip({
  edge,
  resolved,
  fallback,
}: {
  edge: EdgeName
  resolved: ResolvedEdge
  fallback: ColorValue
}) {
  return (
    <View
      pointerEvents="none"
      style={[stripLayout(edge, resolved.size), { [BACKGROUND_IMAGE_KEY]: [stripGradient(edge, resolved, fallback)] }]}
    />
  )
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
    radius,
    style,
    children,
    ...viewProps
  } = props
  // borderRadius never reaches a host view: the mask path needs it as a
  // fade-integrated fadeRadius, the core path as a clipped container.
  const flat = (StyleSheet.flatten(style) ?? {}) as Record<string, unknown>
  const { borderRadius: _ignored, ...cleanStyle } = flat
  const resolvedRadius = resolveRadius(radius, style)

  if (resolved.mode === 'overlay') {
    const radiusStyle =
      resolvedRadius != null ? { borderRadius: resolvedRadius, overflow: 'hidden' as const } : null
    // explicit overlay without a color falls back to black, matching
    // upstream edge-fade's per-edge default (edge color, global, black).
    const fallback = resolved.color ?? 'black'
    return (
      <View style={[cleanStyle, radiusStyle]} {...viewProps}>
        {children}
        {resolved.top && <OverlayStrip edge="top" resolved={resolved.top} fallback={fallback} />}
        {resolved.bottom && (
          <OverlayStrip edge="bottom" resolved={resolved.bottom} fallback={fallback} />
        )}
        {resolved.left && <OverlayStrip edge="left" resolved={resolved.left} fallback={fallback} />}
        {resolved.right && (
          <OverlayStrip edge="right" resolved={resolved.right} fallback={fallback} />
        )}
      </View>
    )
  }

  const native = resolveNativeProps(resolved, resolvedRadius)
  return (
    <NativeEdgeFade
      {...viewProps}
      style={cleanStyle as typeof style}
      fadeTop={native.fadeTop}
      fadeBottom={native.fadeBottom}
      fadeLeft={native.fadeLeft}
      fadeRight={native.fadeRight}
      curveTop={native.curveTop}
      curveBottom={native.curveBottom}
      curveLeft={native.curveLeft}
      curveRight={native.curveRight}
      fadeRadius={native.fadeRadius}
    >
      {children}
    </NativeEdgeFade>
  )
}
