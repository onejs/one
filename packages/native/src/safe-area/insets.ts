import type {
  Edge,
  EdgeInsets,
  EdgeMode,
  Edges,
  Metrics,
  NativeInsetsChangePayload,
} from './types'

// pure inset math shared by every SafeAreaView. no react-native imports, so
// both the web and the native entries re-export this file. edge semantics
// match upstream: an omitted edges prop applies every edge additively, an
// array lists the additive edges, and a record assigns a mode per edge.
export function resolveSafeAreaEdgeModes(edges?: Edges | null): Record<Edge, EdgeMode> {
  const all: Edge[] = ['top', 'right', 'bottom', 'left']
  if (edges == null) {
    return { top: 'additive', right: 'additive', bottom: 'additive', left: 'additive' }
  }
  if (Array.isArray(edges)) {
    return Object.fromEntries(
      all.map((edge) => [edge, edges.includes(edge) ? 'additive' : 'off'])
    ) as Record<Edge, EdgeMode>
  }
  return Object.fromEntries(
    all.map((edge) => {
      const mode = (edges as Record<string, unknown>)[edge]
      return [
        edge,
        mode === 'maximum' || mode === 'additive' || mode === 'off' ? mode : 'off',
      ]
    })
  ) as Record<Edge, EdgeMode>
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {}
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map((entry) => flattenStyle(entry)))
  }
  return typeof style === 'object' ? (style as Record<string, unknown>) : {}
}

function readBaseInset(
  style: Record<string, unknown>,
  mode: 'padding' | 'margin',
  edge: Edge
): number {
  const capitalized = edge.charAt(0).toUpperCase() + edge.slice(1)
  const exact = style[`${mode}${capitalized}`]
  if (typeof exact === 'number') return exact
  const axis =
    edge === 'top' || edge === 'bottom'
      ? style[`${mode}Vertical`]
      : style[`${mode}Horizontal`]
  if (typeof axis === 'number') return axis
  const base = style[mode]
  return typeof base === 'number' ? base : 0
}

// the four padding or margin values a SafeAreaView applies. maximum keeps
// the larger of the style value and the inset, additive sums them, and off
// leaves the style value alone. the caller spreads the result over the
// flattened style.
export function buildSafeAreaInsetStyle(options: {
  insets: EdgeInsets
  edges?: Edges | null
  mode?: 'padding' | 'margin'
  style?: unknown
}): Record<string, number> {
  const mode = options.mode === 'margin' ? 'margin' : 'padding'
  const flattened = flattenStyle(options.style)
  const edgeModes = resolveSafeAreaEdgeModes(options.edges)
  const output: Record<string, number> = {}
  for (const edge of ['top', 'right', 'bottom', 'left'] as Edge[]) {
    const base = readBaseInset(flattened, mode, edge)
    const inset = options.insets[edge]
    const edgeMode = edgeModes[edge]
    const value =
      edgeMode === 'off'
        ? base
        : edgeMode === 'maximum'
          ? Math.max(base, inset)
          : base + inset
    output[`${mode}${edge.charAt(0).toUpperCase() + edge.slice(1)}`] = value
  }
  return output
}

// reshape the flat provider event into context Metrics. a non-finite field
// is a native bug, so it throws rather than poisoning every consumer with NaN.
export function providerEventToMetrics(payload: NativeInsetsChangePayload): Metrics {
  for (const [key, value] of Object.entries(payload)) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`OneNativeSafeAreaProvider emitted non-finite ${key}`)
    }
  }
  return {
    insets: {
      top: payload.insetTop,
      right: payload.insetRight,
      bottom: payload.insetBottom,
      left: payload.insetLeft,
    },
    frame: {
      x: payload.frameX,
      y: payload.frameY,
      width: payload.frameWidth,
      height: payload.frameHeight,
    },
  }
}
