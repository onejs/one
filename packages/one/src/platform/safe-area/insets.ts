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

function flattenStyle(
  style: unknown,
  resolveStyle?: (style: any) => any
): Record<string, unknown> {
  if (!style) return {}
  if (resolveStyle) {
    const resolved = resolveStyle(style)
    if (!resolved || typeof resolved !== 'object' || Array.isArray(resolved)) {
      return flattenStyle(resolved)
    }
    return resolved as Record<string, unknown>
  }
  if (Array.isArray(style)) {
    return Object.assign({}, ...style.map((entry) => flattenStyle(entry)))
  }
  if (typeof style === 'number') {
    throw new Error(
      'buildSafeAreaInsetStyle cannot read a registered StyleSheet ID without resolveStyle; pass StyleSheet.flatten'
    )
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
// flattened style. pass the platform StyleSheet.flatten as resolveStyle so
// registered numeric style IDs resolve to their base values.
export function buildSafeAreaInsetStyle(options: {
  insets: EdgeInsets
  edges?: Edges | null
  mode?: 'padding' | 'margin'
  style?: unknown
  resolveStyle?: (style: any) => any
}): Record<string, number> {
  const mode = options.mode === 'margin' ? 'margin' : 'padding'
  const flattened = flattenStyle(options.style, options.resolveStyle)
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

// the keyboard never becomes safe area: on platforms where the system
// bottom inset includes the soft keyboard, the stable inset (which never
// does) caps it. mirrors upstream Android's min(system, stable) rule.
export function keyboardSafeBottom(systemBottom: number, stableBottom: number): number {
  return Math.min(systemBottom, stableBottom)
}

// the overlap between the window insets and one provider view, in the same
// unit as the inputs. a provider below the status bar reports top 0 even
// though the window top inset is large; only the overlapping part reaches
// React. mirrors upstream Android's getSafeAreaInsets exactly, and the
// Android view implements this same formula natively.
export function resolveOverlappingInsets(options: {
  windowInsets: EdgeInsets
  windowWidth: number
  windowHeight: number
  visibleLeft: number
  visibleTop: number
  viewWidth: number
  viewHeight: number
}): EdgeInsets {
  const {
    windowInsets,
    windowWidth,
    windowHeight,
    visibleLeft,
    visibleTop,
    viewWidth,
    viewHeight,
  } = options
  return {
    top: Math.max(windowInsets.top - visibleTop, 0),
    right: Math.max(
      Math.min(visibleLeft + viewWidth - windowWidth, 0) + windowInsets.right,
      0
    ),
    bottom: Math.max(
      Math.min(visibleTop + viewHeight - windowHeight, 0) + windowInsets.bottom,
      0
    ),
    left: Math.max(windowInsets.left - visibleLeft, 0),
  }
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
