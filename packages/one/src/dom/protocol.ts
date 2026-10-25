import { DOMBridgeError, serializeData, type DOMState } from './serialize'
import type { DOMError, DOMValue } from './types'

export const DOM_PROTOCOL_VERSION = 1 as const

export type DOMBootstrap = DOMState & {
  version: typeof DOM_PROTOCOL_VERSION
  entryId: string
  os: 'ios' | 'android'
  epoch: string
}

type Envelope = { version: 1; epoch: string }
export type DOMMessage = Envelope &
  (
    | { type: 'ready'; revision: number }
    | ({ type: 'state' } & DOMState)
    | { type: 'call'; requestId: string; name: string; args: DOMValue[] }
    | { type: 'result'; requestId: string; result: DOMResult }
    | { type: 'handle'; methods: string[] }
    | { type: 'size'; width: number; height: number }
    | { type: 'error'; error: DOMError }
    | { type: 'dispose' }
  )

export type DOMResult =
  | { status: 'value'; value: DOMValue }
  | { status: 'void' }
  | { status: 'error'; error: DOMError }

function fail(message: string): never {
  throw new DOMBridgeError(message)
}

function object(value: unknown): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    fail('Expected a protocol object')
}

function keys(value: Record<string, unknown>, allowed: string[]) {
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) fail(`Unexpected protocol field ${key}`)
  }
}

function string(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value) fail('Expected a nonempty protocol string')
}

function revision(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    fail('Invalid state revision')
}

function names(value: unknown): asserts value is string[] {
  if (!Array.isArray(value)) fail('Expected a list of names')
  value.forEach(string)
  if (new Set(value).size !== value.length) fail('Duplicate protocol names')
}

function state(value: Record<string, any>) {
  revision(value.revision)
  object(value.props)
  names(value.actions)
  if (value.actions.some((name: string) => Object.hasOwn(value.props, name))) {
    fail('A prop cannot also be an action')
  }
}

function remoteError(value: unknown) {
  object(value)
  keys(value, ['name', 'message', 'code', 'stack'])
  if (typeof value.name !== 'string' || typeof value.message !== 'string')
    fail('Invalid remote error')
  for (const key of ['code', 'stack']) {
    if (Object.hasOwn(value, key) && typeof value[key] !== 'string')
      fail('Invalid remote error')
  }
}

export function parseBootstrap(value: unknown, entryId: string): DOMBootstrap {
  const data: unknown = serializeData(value)
  object(data)
  keys(data, ['version', 'entryId', 'os', 'epoch', 'revision', 'props', 'actions'])
  if (data.version !== DOM_PROTOCOL_VERSION) fail('Unsupported DOM protocol version')
  if (data.entryId !== entryId) fail('DOM entry identity mismatch')
  if (data.os !== 'ios' && data.os !== 'android') fail('Invalid DOM host platform')
  string(data.epoch)
  state(data)
  return data as DOMBootstrap
}

/** the same parser guards both directions before any handler is dispatched. */
export function parseMessage(raw: string): DOMMessage {
  if (typeof raw !== 'string') fail('Expected a JSON protocol string')
  let data: any
  try {
    data = JSON.parse(raw)
  } catch {
    fail('Malformed DOM protocol JSON')
  }
  object(data)
  if (data.version !== DOM_PROTOCOL_VERSION) fail('Unsupported DOM protocol version')
  string(data.epoch)
  const common = ['version', 'epoch', 'type']
  switch (data.type) {
    case 'ready':
      keys(data, [...common, 'revision'])
      revision(data.revision)
      break
    case 'state':
      keys(data, [...common, 'revision', 'props', 'actions'])
      state(data)
      serializeData(data.props)
      break
    case 'call':
      keys(data, [...common, 'requestId', 'name', 'args'])
      string(data.requestId)
      string(data.name)
      if (!Array.isArray(data.args)) fail('Expected call arguments')
      serializeData(data.args, 'arguments')
      break
    case 'result': {
      keys(data, [...common, 'requestId', 'result'])
      string(data.requestId)
      object(data.result)
      const result = data.result
      switch (result.status) {
        case 'value':
          keys(result, ['status', 'value'])
          if (!Object.hasOwn(result, 'value')) fail('Missing result value')
          serializeData(result.value, 'result')
          break
        case 'void':
          keys(result, ['status'])
          break
        case 'error':
          keys(result, ['status', 'error'])
          remoteError(result.error)
          break
        default:
          fail('Invalid result status')
      }
      break
    }
    case 'handle':
      keys(data, [...common, 'methods'])
      names(data.methods)
      break
    case 'size':
      keys(data, [...common, 'width', 'height'])
      if (
        ![data.width, data.height].every(
          (n) => typeof n === 'number' && Number.isFinite(n) && n >= 0
        )
      ) {
        fail('Invalid DOM size')
      }
      break
    case 'dispose':
      keys(data, common)
      break
    case 'error':
      keys(data, [...common, 'error'])
      remoteError(data.error)
      break
    default:
      fail('Unknown DOM message type')
  }
  return data as DOMMessage
}
