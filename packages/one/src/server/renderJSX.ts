import * as React from 'react'

// one-way server jsx: a loader walks a react element tree on the server and returns a compact
// json envelope. the client revives it into real elements, and `use client` components stay
// references resolved from the client registry. no flight, no third vite environment.

export type JSXEnvelopeNode =
  | string
  | number
  | null
  | ['h', string, Record<string, any>, ...JSXEnvelopeNode[]]
  | ['c', string, Record<string, any>, JSXEnvelopeNode?]
  | ['s', string, Record<string, any>, JSXEnvelopeNode?]
  | ['f', ...JSXEnvelopeNode[]]

export type JSXEnvelope = { __oneJSX: JSXEnvelopeNode }

const CLIENT_ID = '__oneClientId'

type SlotProps = { name: string; children?: React.ReactNode; [key: string]: any }

/** a named hole the client fills in with a component, rendered as `children` until then */
export function JSXSlot(_props: SlotProps): React.ReactElement {
  throw new Error('[one] JSXSlot only works inside a tree passed to renderJSX')
}

/** shows `fallback` in place of a client component whose id the running client does not know */
export function ClientFallback(_props: {
  fallback: React.ReactNode
  children?: React.ReactNode
}): React.ReactElement {
  throw new Error('[one] ClientFallback only works inside a tree passed to renderJSX')
}

// hooks that need a client runtime. everything else (useId, useMemo, use, ...) is fine on a server.
const REJECTED_HOOKS = [
  'useState',
  'useReducer',
  'useRef',
  'useEffect',
  'useLayoutEffect',
  'useInsertionEffect',
  'useImperativeHandle',
  'useSyncExternalStore',
  'useTransition',
  'useDeferredValue',
  'useOptimistic',
  'useActionState',
  'useContext',
  'useDebugValue',
  'useEffectEvent',
] as const

function createServerDispatcher(componentName: string) {
  const dispatcher: Record<string, any> = {
    useId: () => '',
    useMemo: (fn: () => any) => fn(),
    useCallback: (fn: any) => fn,
    use: (usable: any) => {
      if (usable && typeof usable.then === 'function') {
        throw new Error(
          `[one] renderJSX: use(promise) is not supported in <${componentName}>. Make the component async and await it.`
        )
      }
      throw new Error(`[one] renderJSX: use(context) is not supported in <${componentName}>.`)
    },
    readContext: () => {
      throw new Error(`[one] renderJSX: context is not available in <${componentName}>.`)
    },
  }
  for (const hook of REJECTED_HOOKS) {
    dispatcher[hook] = () => {
      throw new Error(
        `[one] renderJSX: <${componentName}> called ${hook}, which only works in a client component. ` +
          `Add 'use client' to the file that exports <${componentName}>, or remove the hook.`
      )
    }
  }
  return dispatcher
}

function callServerComponent(fn: Function, props: any, name: string) {
  const reactInternals = (React as any)
    .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
  const previous = reactInternals.H
  reactInternals.H = createServerDispatcher(name)
  try {
    return fn(props)
  } finally {
    reactInternals.H = previous
  }
}

function typeName(type: any): string {
  return type?.displayName || type?.name || 'Component'
}

function isElement(value: any): value is React.ReactElement {
  return React.isValidElement(value)
}

function fail(path: string, what: string): never {
  throw new Error(
    `[one] renderJSX: ${what} at ${path} cannot cross to the client. ` +
      `Props passed to client components and slots must be JSON-serializable or React elements.`
  )
}

// props cross the wire as json. elements in props are rendered to their own envelope,
// wrapped as { __oneJSX } so the client can tell them from plain arrays.
async function serializeValue(value: any, path: string): Promise<any> {
  if (value === null) return null
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return value
    case 'number':
      if (!Number.isFinite(value)) fail(path, `non-finite number ${value}`)
      return value
    case 'undefined':
      return undefined
    case 'function':
      return fail(path, 'a function')
    case 'symbol':
      return fail(path, 'a symbol')
    case 'bigint':
      return fail(path, 'a bigint')
  }
  if (isElement(value) || (Array.isArray(value) && value.some(isElement))) {
    return { __oneJSX: await walk(value, path) }
  }
  if (Array.isArray(value)) {
    return Promise.all(value.map((item, i) => serializeValue(item, `${path}[${i}]`)))
  }
  const proto = Object.getPrototypeOf(value)
  if (proto !== Object.prototype && proto !== null) {
    return fail(path, `an instance of ${proto?.constructor?.name ?? 'a class'}`)
  }
  const out: Record<string, any> = {}
  await Promise.all(
    Object.keys(value).map(async (key) => {
      const serialized = await serializeValue(value[key], `${path}.${key}`)
      if (serialized !== undefined) out[key] = serialized
    })
  )
  return out
}

async function serializeProps(props: Record<string, any>, path: string, skip?: string) {
  const out: Record<string, any> = {}
  const keys = Object.keys(props).filter((key) => key !== skip)
  // key order stays stable so the envelope is deterministic
  const values = await Promise.all(keys.map((key) => serializeValue(props[key], `${path}.${key}`)))
  keys.forEach((key, i) => {
    if (values[i] !== undefined) out[key] = values[i]
  })
  return out
}

async function walkChildren(children: any, path: string): Promise<JSXEnvelopeNode[]> {
  const list = Array.isArray(children) ? children : [children]
  const results = await Promise.all(list.map((child, i) => walk(child, `${path}[${i}]`)))
  const flat: JSXEnvelopeNode[] = []
  for (const node of results) {
    if (node === null) continue
    if (Array.isArray(node) && node[0] === 'f') flat.push(...(node.slice(1) as JSXEnvelopeNode[]))
    else flat.push(node)
  }
  return flat
}

function withFallback(node: JSXEnvelopeNode, fallback: JSXEnvelopeNode): JSXEnvelopeNode {
  if (Array.isArray(node)) {
    if (node[0] === 'c' && node[3] === undefined) return ['c', node[1], node[2], fallback]
    if (node[0] === 'f') {
      return ['f', ...(node.slice(1) as JSXEnvelopeNode[]).map((n) => withFallback(n, fallback))]
    }
  }
  return node
}

async function walk(node: any, path: string): Promise<JSXEnvelopeNode> {
  if (node === null || node === undefined || typeof node === 'boolean') return null
  if (typeof node === 'string' || typeof node === 'number') return node
  if (Array.isArray(node)) return ['f', ...(await walkChildren(node, path))]
  if (typeof node === 'object' && typeof node.then === 'function') {
    return walk(await node, path)
  }
  if (!isElement(node)) return fail(path, `a ${typeof node} child`)

  const { type, props } = node as { type: any; props: Record<string, any> }
  const here = `${path}<${typeof type === 'string' ? type : typeName(type)}>`

  if (type === React.Fragment) return ['f', ...(await walkChildren(props.children, here))]

  if (typeof type === 'string') {
    const hostProps = await serializeProps(props, here, 'children')
    return ['h', type, hostProps, ...(await walkChildren(props.children, here))]
  }

  if (type === JSXSlot) {
    const { name, children, ...rest } = props as SlotProps
    if (typeof name !== 'string' || !name) fail(here, 'a JSXSlot without a string name')
    const slotProps = await serializeProps(rest, here)
    const fallback = children == null ? undefined : await walk(children, here)
    return fallback === undefined || fallback === null
      ? ['s', name, slotProps]
      : ['s', name, slotProps, fallback]
  }

  if (type === ClientFallback) {
    const fallback = await walk(props.fallback, here)
    return withFallback(await walk(props.children, here), fallback)
  }

  const clientId: string | undefined = type?.[CLIENT_ID]
  if (clientId) {
    return ['c', clientId, await serializeProps(props, here)]
  }

  // memo, forwardRef: unwrap to the inner component
  if (type && typeof type === 'object') {
    const marker = String(type.$$typeof)
    if (marker === 'Symbol(react.memo)') {
      return walk(React.createElement(type.type, props), path)
    }
    if (marker === 'Symbol(react.forward_ref)') {
      return walk(await callServerComponent(type.render, props, typeName(type)), path)
    }
    return fail(here, 'an unsupported component type')
  }

  if (typeof type === 'function') {
    // async components resolve here; sibling subtrees walk in parallel through Promise.all above
    return walk(await callServerComponent(type, props, typeName(type)), path)
  }

  return fail(here, 'an unsupported element type')
}

/**
 * Walk a React element tree on the server and return a JSON envelope for a loader to return.
 * Server components run here; `use client` components and universal primitives stay as references.
 */
export async function renderJSX(element: React.ReactNode): Promise<JSXEnvelope> {
  return { __oneJSX: await walk(element, '') }
}
