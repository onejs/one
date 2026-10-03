import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { domStyle, VIEW_BASE } from '../web/DomView'
import type { PortalProps, PortalHostProps } from './portalTypes'
export type { PortalProps, PortalHostProps } from './portalTypes'

type Entry = {
  hostName?: string
  name?: string
  source: HTMLElement
  content: HTMLElement
  style: CSSProperties
}
const hosts = new Map<string, HTMLElement>()
const portals: Entry[] = []
function refresh() {
  for (let i = 0; i < portals.length; i++) {
    const portal = portals[i]
    const replaced =
      portal.name != null &&
      portals.slice(i + 1).some((other) => other.name === portal.name)
    if (replaced) {
      portal.content.remove()
      continue
    }
    const host = portal.hostName == null ? null : hosts.get(portal.hostName)
    const target = host ?? portal.source
    portal.content.removeAttribute('style')
    Object.assign(
      portal.content.style,
      host
        ? {
            ...VIEW_BASE,
            ...portal.style,
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }
        : { display: 'contents' }
    )
    portal.source.style.position = host
      ? 'absolute'
      : (portal.style.position ?? 'relative')
    // appending a mounted DOM node preserves the React tree and local state.
    target.appendChild(portal.content)
  }
}
export function Portal({
  hostName,
  name,
  children,
  style,
  testID,
  nativeID,
  accessibilityLabel,
}: PortalProps) {
  const source = useRef<HTMLDivElement>(null)
  const entry = useRef<Entry | null>(null)
  const [content, setContent] = useState<HTMLDivElement | null>(null)
  useEffect(() => {
    if (!source.current) return
    const node = document.createElement('div')
    const value = {
      hostName: hostName || undefined,
      name: name || undefined,
      source: source.current,
      content: node,
      style: domStyle(style),
    }
    entry.current = value
    portals.push(value)
    setContent(node)
    refresh()
    return () => {
      portals.splice(portals.indexOf(value), 1)
      node.remove()
      entry.current = null
      refresh()
    }
  }, [])
  useEffect(() => {
    const value = entry.current
    if (!value) return
    value.hostName = hostName || undefined
    value.name = name || undefined
    value.style = domStyle(style)
    refresh()
  }, [hostName, name, style])
  return (
    <div
      ref={source}
      data-testid={testID}
      id={nativeID}
      aria-label={accessibilityLabel}
      style={{
        ...VIEW_BASE,
        ...domStyle(style),
      }}
    >
      {content
        ? createPortal(
            <div style={{ display: 'contents', pointerEvents: 'auto' }}>{children}</div>,
            content
          )
        : null}
    </div>
  )
}
export function PortalHost({
  name,
  children,
  style,
  testID,
  nativeID,
  accessibilityLabel,
}: PortalHostProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const node = ref.current
    if (!node) return
    hosts.set(name, node)
    refresh()
    return () => {
      if (hosts.get(name) === node) hosts.delete(name)
      refresh()
    }
  }, [name])
  return (
    <div
      ref={ref}
      data-testid={testID}
      id={nativeID}
      aria-label={accessibilityLabel}
      // the host passes touches through; its own children and portaled
      // content take them back, so a full-screen host blocks nothing beneath it.
      style={{ ...VIEW_BASE, ...domStyle(style), pointerEvents: 'none' }}
    >
      <div style={{ display: 'contents', pointerEvents: 'auto' }}>{children}</div>
    </div>
  )
}
