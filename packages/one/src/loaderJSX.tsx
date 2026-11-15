import * as React from 'react'
import type { JSXEnvelope, JSXEnvelopeNode } from './server/renderJSX'

// client and ssr side of loader jsx. the server walker (server/renderJSX) returns json envelopes,
// this turns them back into elements. render is synchronous so ssr html matches frame-1 hydration.

export type RevivedLoaderData<T> = T extends JSXEnvelope
  ? React.ReactNode
  : T extends (...args: any[]) => any
    ? T
    : T extends readonly unknown[]
      ? { [K in keyof T]: RevivedLoaderData<T[K]> }
      : T extends object
        ? { [K in keyof T]: RevivedLoaderData<T[K]> }
        : T

type ClientModule = Record<string, any>
type ClientEntry = ClientModule | (() => Promise<ClientModule>)

const modules = new Map<string, ClientEntry>()
const lazyComponents = new Map<string, React.ComponentType<any>>()
const universal = new Map<string, React.ComponentType<any>>()

/** register the exports of a `use client` module. a loader function code-splits it, a namespace is eager. */
export function registerLoaderClientModule(path: string, entry: ClientEntry) {
  modules.set(path, entry)
}

/** register a single component under an exact client id, used for the universal preset */
export function registerLoaderClient(id: string, component: React.ComponentType<any>) {
  ;(component as any).__oneClientId = id
  universal.set(id, component)
}

function resolveClient(id: string): React.ComponentType<any> | undefined {
  const direct = universal.get(id)
  if (direct) return direct

  const split = id.lastIndexOf('#')
  if (split < 0) return
  const path = id.slice(0, split)
  const name = id.slice(split + 1)
  const entry = modules.get(path)
  if (!entry) return

  if (typeof entry !== 'function') return entry[name]

  let lazy = lazyComponents.get(id)
  if (!lazy) {
    lazy = React.lazy(() => entry().then((mod) => ({ default: mod[name] })))
    lazyComponents.set(id, lazy)
  }
  return lazy
}

export type LoaderJSXSlots = Record<
  string,
  React.ComponentType<any> | React.ReactElement | ((props: any) => React.ReactNode)
>

export function isLoaderJSXEnvelope(value: unknown): value is JSXEnvelope {
  return typeof value === 'object' && value !== null && '__oneJSX' in value
}

function reviveValue(value: any, slots: LoaderJSXSlots | undefined): any {
  if (value === null || typeof value !== 'object') return value
  if (isLoaderJSXEnvelope(value)) return reviveNode(value.__oneJSX, slots)
  if (Array.isArray(value)) return value.map((item) => reviveValue(item, slots))
  const out: Record<string, any> = {}
  for (const key in value) out[key] = reviveValue(value[key], slots)
  return out
}

function reviveProps(props: Record<string, any>, slots: LoaderJSXSlots | undefined) {
  const out: Record<string, any> = {}
  for (const key in props) out[key] = reviveValue(props[key], slots)
  return out
}

function reviveChildren(nodes: JSXEnvelopeNode[], slots: LoaderJSXSlots | undefined) {
  return nodes.map((node) => reviveNode(node, slots))
}

function reviveNode(
  node: JSXEnvelopeNode,
  slots: LoaderJSXSlots | undefined
): React.ReactNode {
  if (node === null || typeof node !== 'object') return node
  switch (node[0]) {
    case 'h':
      return React.createElement(
        node[1],
        reviveProps(node[2], slots),
        ...reviveChildren(node.slice(3) as JSXEnvelopeNode[], slots)
      )
    case 'f':
      return React.createElement(
        React.Fragment,
        null,
        ...reviveChildren(node.slice(1) as JSXEnvelopeNode[], slots)
      )
    case 'c': {
      const [, id, props, fallback] = node
      const Component = resolveClient(id)
      // an id this client build does not know, usually version skew between server and client
      if (!Component) return fallback ? reviveNode(fallback, slots) : null
      const element = React.createElement(Component, reviveProps(props, slots))
      return isLazy(Component)
        ? React.createElement(
            React.Suspense,
            { fallback: fallback ? reviveNode(fallback, slots) : null },
            element
          )
        : element
    }
    case 's': {
      const [, name, props, fallback] = node
      const slot = slots?.[name]
      const fallbackNode = fallback ? reviveNode(fallback, slots) : null
      if (slot === undefined) return fallbackNode
      if (React.isValidElement(slot)) return slot
      return React.createElement(
        slot as React.ComponentType<any>,
        reviveProps(props, slots),
        fallbackNode
      )
    }
  }
  return null
}

function isLazy(component: any) {
  return String(component?.$$typeof) === 'Symbol(react.lazy)'
}

const NO_SLOTS = {}
const envelopeMemo = new WeakMap<object, WeakMap<object, React.ReactNode>>()

/** revive an envelope to elements. memoized by envelope (and slots) reference so renders stay stable. */
export function reviveLoaderJSX(
  envelope: JSXEnvelope,
  slots?: LoaderJSXSlots
): React.ReactNode {
  let bySlots = envelopeMemo.get(envelope)
  if (!bySlots) {
    bySlots = new WeakMap()
    envelopeMemo.set(envelope, bySlots)
  }
  const key = slots ?? NO_SLOTS
  if (bySlots.has(key)) return bySlots.get(key)
  const revived = reviveNode(envelope.__oneJSX, slots)
  bySlots.set(key, revived)
  return revived
}

const dataMemo = new WeakMap<object, any>()

function containsEnvelope(value: any): boolean {
  if (value === null || typeof value !== 'object') return false
  if (isLoaderJSXEnvelope(value)) return true
  if (Array.isArray(value)) return value.some(containsEnvelope)
  for (const key in value) if (containsEnvelope(value[key])) return true
  return false
}

/**
 * Replace every envelope inside loader data with its revived elements.
 * Data without envelopes is returned as-is, and the result is memoized per data reference.
 */
export function reviveLoaderData<T>(data: T): RevivedLoaderData<T> {
  if (data === null || typeof data !== 'object') return data as RevivedLoaderData<T>
  if (dataMemo.has(data)) return dataMemo.get(data)
  const result = containsEnvelope(data) ? reviveValue(data, undefined) : data
  dataMemo.set(data, result)
  return result
}

/** render a loader envelope, optionally filling named slots with client components */
export function ServerJSX(props: { value: JSXEnvelope; slots?: LoaderJSXSlots }) {
  return <>{reviveLoaderJSX(props.value, props.slots)}</>
}
