import type { DOMError, DOMValue } from './types'

export class DOMBridgeError extends Error {
  constructor(
    message: string,
    public code = 'DOM_PROTOCOL_ERROR'
  ) {
    super(message)
    this.name = 'DOMBridgeError'
  }
}

function invalid(path: string, reason: string): never {
  throw new DOMBridgeError(`${path}: ${reason}`, 'DOM_SERIALIZATION_ERROR')
}

/** validate before JSON.stringify can silently drop or coerce unsupported data. */
export function serializeData(value: unknown, path = '$'): DOMValue {
  const ancestors = new Set<object>()
  function visit(item: unknown, at: string): DOMValue {
    if (item === null || typeof item === 'string' || typeof item === 'boolean') {
      return item
    }
    if (typeof item === 'number' && Number.isFinite(item)) return item
    if (typeof item !== 'object' || item === null) {
      return invalid(at, `unsupported ${typeof item} value`)
    }
    if (ancestors.has(item)) return invalid(at, 'cyclic value')
    if (!Array.isArray(item)) {
      const proto = Object.getPrototypeOf(item)
      if (proto !== Object.prototype && proto !== null) {
        return invalid(at, 'expected a plain object')
      }
    }
    if (Object.getOwnPropertySymbols(item).length) {
      return invalid(at, 'symbol properties are unsupported')
    }
    ancestors.add(item)
    try {
      if (Array.isArray(item)) {
        return Array.from({ length: item.length }, (_, index) => {
          const descriptor = Object.getOwnPropertyDescriptor(item, String(index))
          if (!descriptor || !('value' in descriptor)) {
            return invalid(`${at}[${index}]`, 'array holes and accessors are unsupported')
          }
          return visit(descriptor.value, `${at}[${index}]`)
        })
      }
      const result: Record<string, DOMValue> = Object.create(null)
      for (const key of Object.keys(item).sort()) {
        const descriptor = Object.getOwnPropertyDescriptor(item, key)!
        const nextPath = `${at}[${JSON.stringify(key)}]`
        if (!('value' in descriptor)) return invalid(nextPath, 'accessor is unsupported')
        if (descriptor.value !== undefined)
          result[key] = visit(descriptor.value, nextPath)
      }
      return result
    } finally {
      ancestors.delete(item)
    }
  }
  return visit(value, path)
}

export type DOMActions = Map<string, (...args: any[]) => unknown>
export type DOMState = {
  revision: number
  props: Record<string, DOMValue>
  actions: string[]
}

export function serializeProps(props: Record<string, unknown>): {
  props: Record<string, DOMValue>
  actions: DOMActions
  key: string
} {
  const prototype = Object.getPrototypeOf(props)
  if (
    (prototype !== Object.prototype && prototype !== null) ||
    Object.getOwnPropertySymbols(props).length
  ) {
    invalid('props', 'expected plain props with string property names')
  }
  const data: Record<string, DOMValue> = Object.create(null)
  const actions: DOMActions = new Map()
  for (const name of Object.keys(props).sort()) {
    const descriptor = Object.getOwnPropertyDescriptor(props, name)!
    if (!('value' in descriptor))
      invalid(`props[${JSON.stringify(name)}]`, 'accessor is unsupported')
    const value = descriptor.value
    if (name === 'children' && value !== undefined) {
      invalid('props.children', 'children cannot cross the DOM boundary')
    }
    if (typeof value === 'function') actions.set(name, value)
    else if (value !== undefined)
      data[name] = serializeData(value, `props[${JSON.stringify(name)}]`)
  }
  return { props: data, actions, key: JSON.stringify([data, [...actions.keys()]]) }
}

export function serializeError(error: unknown, development = false): DOMError {
  let result: DOMError = { name: 'Error', message: 'An unsupported error was thrown' }
  try {
    if (error instanceof Error) {
      result = { name: String(error.name || 'Error'), message: String(error.message) }
      const code = (error as Error & { code?: unknown }).code
      if (typeof code === 'string') result.code = code
      if (development && typeof error.stack === 'string') result.stack = error.stack
    } else if (
      error === null ||
      ['string', 'number', 'boolean', 'undefined', 'bigint'].includes(typeof error)
    ) {
      result.message = String(error)
    }
  } catch {
    // hostile error getters must not prevent a request from settling.
  }
  return result
}

export function deserializeError(error: DOMError): Error {
  const result = new DOMBridgeError(error.message, error.code || 'DOM_REMOTE_ERROR')
  result.name = error.name
  if (error.stack) result.stack = error.stack
  return result
}
