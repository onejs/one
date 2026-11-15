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
      throw new Error(
        `[one] renderJSX: use(context) is not supported in <${componentName}>.`
      )
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

type DispatcherStore = {
  getStore(): Record<string, any> | undefined
  run<T>(store: Record<string, any>, fn: () => T): T
}

let dispatcherStore: DispatcherStore | null | undefined
function getDispatcherStore(): DispatcherStore | null {
  if (dispatcherStore !== undefined) return dispatcherStore
  const ALS = (globalThis as any).process?.getBuiltinModule?.(
    'node:async_hooks'
  )?.AsyncLocalStorage
  const store: DispatcherStore | null = ALS ? new ALS() : null
  dispatcherStore = store
  return store
}

let activeRenderWalks = 0
let savedBaseDispatcher: any = null

const delegatingServerDispatcher = new Proxy(
  {},
  {
    get(_target, prop) {
      const local = getDispatcherStore()?.getStore()
      if (local) return local[prop as string]
      return savedBaseDispatcher ? savedBaseDispatcher[prop as string] : undefined
    },
  }
)

function callServerComponent(fn: Function, props: any, name: string) {
  const dispatcher = createServerDispatcher(name)
  const store = getDispatcherStore()
  if (store) {
    return store.run(dispatcher, () => fn(props))
  }
  const reactInternals = (React as any)
    .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
  const previous = reactInternals.H
  reactInternals.H = dispatcher
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

function unsupported(path: string, what: string, hint: string): never {
  throw new Error(
    `[one] renderJSX: ${what} at ${path} is not supported in a loader JSX tree. ${hint}`
  )
}

// keys ride inside the props object: createElement extracts `key` from the config on revive,
// so older clients reading a newer envelope keep list identity too
function withKey(node: JSXEnvelopeNode, key: string | null): JSXEnvelopeNode {
  if (key == null || !Array.isArray(node)) return node
  if ((node[0] === 'h' || node[0] === 'c' || node[0] === 's') && node[2].key == null) {
    return [node[0], node[1], { ...node[2], key }, ...node.slice(3)] as JSXEnvelopeNode
  }
  return node
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
  const values = await Promise.all(
    keys.map((key) => serializeValue(props[key], `${path}.${key}`))
  )
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
    if (Array.isArray(node) && node[0] === 'f')
      flat.push(...(node.slice(1) as JSXEnvelopeNode[]))
    else flat.push(node)
  }
  return flat
}

function withFallback(node: JSXEnvelopeNode, fallback: JSXEnvelopeNode): JSXEnvelopeNode {
  if (Array.isArray(node)) {
    if (node[0] === 'c' && node[3] === undefined) return ['c', node[1], node[2], fallback]
    if (node[0] === 'f') {
      return [
        'f',
        ...(node.slice(1) as JSXEnvelopeNode[]).map((n) => withFallback(n, fallback)),
      ]
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

  const { type, props, key } = node as {
    type: any
    props: Record<string, any>
    key: string | null
  }
  const here = `${path}<${typeof type === 'string' ? type : typeName(type)}>`

  if (type === React.Fragment) return ['f', ...(await walkChildren(props.children, here))]

  // server trees resolve inline, so boundaries around them have nothing to wait for
  if (type === React.Suspense || type === React.StrictMode) {
    return ['f', ...(await walkChildren(props.children, here))]
  }

  if (typeof type === 'string') {
    const hostProps = await serializeProps(props, here, 'children')
    return withKey(
      ['h', type, hostProps, ...(await walkChildren(props.children, here))],
      key
    )
  }

  if (type === JSXSlot) {
    const { name, children, ...rest } = props as SlotProps
    if (typeof name !== 'string' || !name) fail(here, 'a JSXSlot without a string name')
    const slotProps = await serializeProps(rest, here)
    const fallback = children == null ? undefined : await walk(children, here)
    return withKey(
      fallback === undefined || fallback === null
        ? ['s', name, slotProps]
        : ['s', name, slotProps, fallback],
      key
    )
  }

  if (type === ClientFallback) {
    const fallback = await walk(props.fallback, here)
    return withKey(withFallback(await walk(props.children, here), fallback), key)
  }

  const clientId: string | undefined = type?.[CLIENT_ID]
  if (clientId) {
    return withKey(['c', clientId, await serializeProps(props, here)], key)
  }

  // memo, forwardRef: unwrap to the inner component
  if (type && typeof type === 'object') {
    const marker = String(type.$$typeof)
    if (marker === 'Symbol(react.memo)') {
      return withKey(await walk(React.createElement(type.type, props), path), key)
    }
    if (marker === 'Symbol(react.forward_ref)') {
      return withKey(
        await walk(await callServerComponent(type.render, props, typeName(type)), path),
        key
      )
    }
    if (
      marker === 'Symbol(react.context)' ||
      marker === 'Symbol(react.provider)' ||
      marker === 'Symbol(react.consumer)'
    ) {
      return unsupported(
        here,
        'a context provider or consumer',
        `Read the value in the loader and pass it down as props, or provide the context inside a 'use client' component.`
      )
    }
    if (marker === 'Symbol(react.lazy)') {
      return unsupported(
        here,
        'a lazy component',
        `Import the component directly in the loader, or move it behind a 'use client' boundary.`
      )
    }
    return unsupported(
      here,
      'this component type',
      `Use a function component or a 'use client' component.`
    )
  }

  if (typeof type === 'function') {
    if ((type as any).prototype?.isReactComponent) {
      return unsupported(
        here,
        `<${typeName(type)}> is a class component`,
        `Server components must be functions. Rewrite it as a function or move it behind a 'use client' boundary.`
      )
    }
    // async components resolve here; sibling subtrees walk in parallel through Promise.all above
    return withKey(
      await walk(await callServerComponent(type, props, typeName(type)), path),
      key
    )
  }

  return unsupported(
    here,
    'this element type',
    `Use a host element, a function component or a 'use client' component.`
  )
}

/**
 * Walk a React element tree on the server and return a JSON envelope for a loader to return.
 * Server components run here; `use client` components and universal primitives stay as references.
 */
export async function renderJSX(element: React.ReactNode): Promise<JSXEnvelope> {
  const reactInternals = (React as any)
    .__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE
  if (activeRenderWalks === 0 && reactInternals) {
    savedBaseDispatcher = reactInternals.H
    reactInternals.H = delegatingServerDispatcher
  }
  activeRenderWalks++
  try {
    return { __oneJSX: await walk(element, '') }
  } finally {
    activeRenderWalks--
    if (activeRenderWalks === 0 && reactInternals) {
      if (reactInternals.H === delegatingServerDispatcher) {
        reactInternals.H = savedBaseDispatcher
      }
      savedBaseDispatcher = null
    }
  }
}
