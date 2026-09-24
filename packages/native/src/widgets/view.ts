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

function node(view: ReactNode): Node {
  if (typeof view === 'string' || typeof view === 'number') {
    return { type: 'text', text: String(view) }
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
  return Children.toArray(content).map(node)
}

export function encodeWidgetView(view: ReactNode): string {
  return JSON.stringify(node(view))
}

export function encodeActivityView(view: ActivityView): string {
  const encoded = JSON.stringify({
    lockScreen: node(view.lockScreen),
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
