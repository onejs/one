import {
  Children,
  Fragment,
  isValidElement,
  type ComponentType,
  type ReactNode,
} from 'react'

export type WidgetStyle = {
  color?: string
  backgroundColor?: string
  fontSize?: number
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold'
  fontDesign?: 'default' | 'rounded' | 'serif' | 'monospaced'
  padding?: number
  borderRadius?: number
  spacing?: number
  width?: number
  height?: number
  opacity?: number
  lineLimit?: number
  alignment?: 'leading' | 'center' | 'trailing'
}

type WidgetProps = { children?: ReactNode; style?: WidgetStyle }
type ImageProps = Omit<WidgetProps, 'children'> & { systemName: string }
type ProgressProps = Omit<WidgetProps, 'children'> & { value: number; total?: number }
type ShapeProps = Omit<WidgetProps, 'children'> & { fill?: string; cornerRadius?: number }
type LinkProps = WidgetProps & { url: string }

export const WidgetUI = Object.freeze({
  Text: 'one-widget-text' as unknown as ComponentType<WidgetProps>,
  VStack: 'one-widget-vstack' as unknown as ComponentType<WidgetProps>,
  HStack: 'one-widget-hstack' as unknown as ComponentType<WidgetProps>,
  ZStack: 'one-widget-zstack' as unknown as ComponentType<WidgetProps>,
  Spacer: 'one-widget-spacer' as unknown as ComponentType<Omit<WidgetProps, 'children'>>,
  Divider: 'one-widget-divider' as unknown as ComponentType<
    Omit<WidgetProps, 'children'>
  >,
  Image: 'one-widget-image' as unknown as ComponentType<ImageProps>,
  Progress: 'one-widget-progress' as unknown as ComponentType<ProgressProps>,
  Gauge: 'one-widget-gauge' as unknown as ComponentType<ProgressProps>,
  Circle: 'one-widget-circle' as unknown as ComponentType<ShapeProps>,
  Rectangle: 'one-widget-rectangle' as unknown as ComponentType<ShapeProps>,
  RoundedRectangle:
    'one-widget-rounded-rectangle' as unknown as ComponentType<ShapeProps>,
  Link: 'one-widget-link' as unknown as ComponentType<LinkProps>,
})

export type ActivityView = {
  lockScreen: ReactNode
  compactLeading?: ReactNode
  compactTrailing?: ReactNode
  minimal?: ReactNode
  expandedLeading?: ReactNode
  expandedTrailing?: ReactNode
  expandedBottom?: ReactNode
}

type Node = {
  type: string
  text?: string
  style?: WidgetStyle
  children?: Node[]
  systemName?: string
  value?: number
  total?: number
  fill?: string
  cornerRadius?: number
  url?: string
}

const hexColor = /^#[0-9a-fA-F]{6}$/

const styleNumberKeys = [
  'fontSize',
  'padding',
  'borderRadius',
  'spacing',
  'width',
  'height',
  'opacity',
] as const

const styleStringKeys = ['fontWeight', 'fontDesign', 'alignment'] as const

// every style value must survive the generated Swift decoder, which reads
// numbers as Double, lineLimit as Int, and colors as #rrggbb. anything else
// fails the whole layout decode, so reject it here where the error is visible.
function checkStyle(style: WidgetStyle | undefined, fill?: unknown): void {
  if (fill != null && (typeof fill !== 'string' || !hexColor.test(fill))) {
    throw new Error('WidgetUI fill must be six-digit hex like #1685B1')
  }
  if (style == null) return
  if (typeof style !== 'object' || Array.isArray(style)) {
    throw new Error('WidgetUI style must be an object')
  }
  for (const key of ['color', 'backgroundColor'] as const) {
    const value = style[key]
    if (value != null && (typeof value !== 'string' || !hexColor.test(value))) {
      throw new Error(`WidgetUI ${key} must be six-digit hex like #1685B1`)
    }
  }
  if (
    style.lineLimit != null &&
    (typeof style.lineLimit !== 'number' || !Number.isInteger(style.lineLimit))
  ) {
    throw new Error('WidgetUI lineLimit must be an integer')
  }
  for (const key of styleNumberKeys) {
    if (style[key] != null && typeof style[key] !== 'number') {
      throw new Error(`WidgetUI ${key} must be a number`)
    }
  }
  for (const key of styleStringKeys) {
    if (style[key] != null && typeof style[key] !== 'string') {
      throw new Error(`WidgetUI ${key} must be a string`)
    }
  }
}

function node(view: ReactNode): Node | null {
  if (view == null || typeof view === 'boolean') return null
  if (typeof view === 'string' || typeof view === 'number') {
    return { type: 'text', text: String(view) }
  }
  if (Array.isArray(view)) {
    return { type: 'vstack', children: children(view) }
  }
  if (!isValidElement(view)) {
    throw new Error('Widget JSX needs a WidgetUI root')
  }
  if (view.type === Fragment) {
    return { type: 'vstack', children: children((view.props as WidgetProps).children) }
  }
  if (typeof view.type === 'function') {
    if (view.type.prototype && 'isReactComponent' in view.type.prototype) {
      throw new Error('Widget JSX supports pure function components')
    }
    return node((view.type as (props: unknown) => ReactNode)(view.props))
  }
  const type =
    typeof view.type === 'string' && view.type.startsWith('one-widget-')
      ? view.type.slice('one-widget-'.length)
      : undefined
  if (
    !type ||
    ![
      'text',
      'vstack',
      'hstack',
      'zstack',
      'spacer',
      'divider',
      'image',
      'progress',
      'gauge',
      'circle',
      'rectangle',
      'rounded-rectangle',
      'link',
    ].includes(type)
  ) {
    throw new Error('Widget JSX only supports WidgetUI primitives and pure components')
  }
  const {
    children: content,
    style,
    ...props
  } = view.props as WidgetProps & ImageProps & ProgressProps & ShapeProps & LinkProps
  checkStyle(style, (props as ShapeProps).fill)
  if (
    (props as ShapeProps).cornerRadius != null &&
    typeof (props as ShapeProps).cornerRadius !== 'number'
  ) {
    throw new Error('WidgetUI cornerRadius must be a number')
  }
  if (type === 'text') {
    const parts = Children.toArray(content)
    if (parts.some((part) => typeof part !== 'string' && typeof part !== 'number')) {
      throw new Error('WidgetUI.Text children must be text or numbers')
    }
    return { type, text: parts.join(''), style }
  }
  if (type === 'image') {
    if (typeof props.systemName !== 'string' || !props.systemName) {
      throw new Error('WidgetUI.Image needs a systemName')
    }
    return { type, style, systemName: props.systemName }
  }
  if (type === 'progress' || type === 'gauge') {
    if (
      !Number.isFinite(props.value) ||
      !Number.isFinite(props.total ?? 1) ||
      (props.total ?? 1) <= 0
    ) {
      throw new Error(
        'WidgetUI progress values must be finite and total must be positive'
      )
    }
    return { type, style, value: props.value, total: props.total ?? 1 }
  }
  if (type === 'circle' || type === 'rectangle' || type === 'rounded-rectangle') {
    return { type, style, fill: props.fill, cornerRadius: props.cornerRadius }
  }
  if (type === 'link') {
    let valid = false
    try {
      valid = Boolean(new URL(props.url).protocol)
    } catch {}
    if (!valid) {
      throw new Error('WidgetUI.Link needs an absolute URL')
    }
    return { type, style, url: props.url, children: children(content) }
  }
  if (type === 'spacer' || type === 'divider') return { type, style }
  return { type, style, children: children(content) }
}

function children(content: ReactNode): Node[] {
  const nodes: Node[] = []
  for (const child of Children.toArray(content)) {
    const next = node(child)
    if (next) nodes.push(next)
  }
  return nodes
}

export function encodeWidgetView(view: ReactNode): string {
  const root = node(view)
  if (!root) {
    throw new Error('Widget JSX needs a WidgetUI root')
  }
  return JSON.stringify(root)
}

export function encodeActivityView(view: ActivityView): string {
  const lockScreen = node(view.lockScreen)
  if (!lockScreen) {
    throw new Error('Live Activity JSX needs a lockScreen layout')
  }
  const encoded = JSON.stringify({
    lockScreen,
    compactLeading: view.compactLeading == null ? null : node(view.compactLeading),
    compactTrailing: view.compactTrailing == null ? null : node(view.compactTrailing),
    minimal: view.minimal == null ? null : node(view.minimal),
    expandedLeading: view.expandedLeading == null ? null : node(view.expandedLeading),
    expandedTrailing: view.expandedTrailing == null ? null : node(view.expandedTrailing),
    expandedBottom: view.expandedBottom == null ? null : node(view.expandedBottom),
  })
  if (new TextEncoder().encode(encoded).length > 3500) {
    throw new Error('Live Activity JSX must fit within 3500 UTF-8 bytes')
  }
  return encoded
}
