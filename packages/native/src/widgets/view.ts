import { Children, Fragment, isValidElement, type ComponentType, type ReactNode } from 'react'

export type WidgetStyle = {
  color?: string
  backgroundColor?: string
  fontSize?: number
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold'
  padding?: number
  borderRadius?: number
  spacing?: number
}

type WidgetProps = { children?: ReactNode; style?: WidgetStyle }

export const WidgetUI = Object.freeze({
  Text: 'one-widget-text' as unknown as ComponentType<WidgetProps>,
  VStack: 'one-widget-vstack' as unknown as ComponentType<WidgetProps>,
  HStack: 'one-widget-hstack' as unknown as ComponentType<WidgetProps>,
  Spacer: 'one-widget-spacer' as unknown as ComponentType<Omit<WidgetProps, 'children'>>,
})

export type ActivityView = {
  lockScreen: ReactNode
  compactLeading?: ReactNode
  compactTrailing?: ReactNode
  minimal?: ReactNode
}

type Node = {
  type: 'text' | 'vstack' | 'hstack' | 'spacer'
  text?: string
  style?: WidgetStyle
  children?: Node[]
}

function node(view: ReactNode): Node {
  if (typeof view === 'string' || typeof view === 'number') {
    return { type: 'text', text: String(view) }
  }
  if (!isValidElement(view)) {
    throw new Error('Widget JSX needs a Text, VStack, HStack, or Spacer root')
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
  const kinds = {
    'one-widget-text': 'text',
    'one-widget-vstack': 'vstack',
    'one-widget-hstack': 'hstack',
    'one-widget-spacer': 'spacer',
  } as const
  const type = typeof view.type === 'string' ? kinds[view.type as keyof typeof kinds] : undefined
  if (!type) throw new Error('Widget JSX only supports WidgetUI primitives and pure components')
  const { children: content, style } = view.props as WidgetProps
  if (type === 'text') {
    const parts = Children.toArray(content)
    if (parts.some((part) => typeof part !== 'string' && typeof part !== 'number')) {
      throw new Error('WidgetUI.Text children must be text or numbers')
    }
    return { type, text: parts.join(''), style }
  }
  return type === 'spacer'
    ? { type }
    : { type, style, children: children(content) }
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
  })
  if (new TextEncoder().encode(encoded).length > 3500) {
    throw new Error('Live Activity JSX must fit within 3500 UTF-8 bytes')
  }
  return encoded
}
