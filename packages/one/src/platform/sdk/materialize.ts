import { callSDK, callSDKAsync, type WireHint } from './wire'

// flags: static, getter, setter, async, sync callbacks, retained, value receiver, observable, background method.
type Member = [
  name: string,
  id: number,
  flags?: number,
  arity?: number,
  hints?: (WireHint | null)[] | null,
  args?: (number | null)[] | null,
]

// fixed arities keep the generated call's argument slots and ignore extra args.
// these are methods so they remain nonconstructible, like class methods.
function implementation(
  module: string,
  id: number,
  flags: number,
  arity: number,
  hints?: (WireHint | null)[]
) {
  'use strict'
  const call = flags & 8 ? callSDKAsync : callSDK
  const sync = !!(flags & 16)
  if (flags & 4) {
    if (flags & 1)
      return {
        invoke(a: unknown) {
          call(module, id, undefined, [a], hints, sync)
        },
      }.invoke
    return {
      invoke(this: unknown, a: unknown) {
        call(module, id, this, [a], hints, sync)
      },
    }.invoke
  }
  if (flags & 64) {
    switch (arity) {
      case 1:
        return {
          invoke(self: unknown) {
            return call(module, id, self, [], hints, sync)
          },
        }.invoke
      case 2:
        return {
          invoke(self: unknown, a: unknown) {
            return call(module, id, self, [a], hints, sync)
          },
        }.invoke
      case 3:
        return {
          invoke(self: unknown, a: unknown, b: unknown) {
            return call(module, id, self, [a, b], hints, sync)
          },
        }.invoke
      case 4:
        return {
          invoke(self: unknown, a: unknown, b: unknown, c: unknown) {
            return call(module, id, self, [a, b, c], hints, sync)
          },
        }.invoke
      case 5:
        return {
          invoke(self: unknown, a: unknown, b: unknown, c: unknown, d: unknown) {
            return call(module, id, self, [a, b, c, d], hints, sync)
          },
        }.invoke
      case 6:
        return {
          invoke(
            self: unknown,
            a: unknown,
            b: unknown,
            c: unknown,
            d: unknown,
            e: unknown
          ) {
            return call(module, id, self, [a, b, c, d, e], hints, sync)
          },
        }.invoke
      case 7:
        return {
          invoke(
            self: unknown,
            a: unknown,
            b: unknown,
            c: unknown,
            d: unknown,
            e: unknown,
            f: unknown
          ) {
            return call(module, id, self, [a, b, c, d, e, f], hints, sync)
          },
        }.invoke
      case 8:
        return {
          invoke(
            self: unknown,
            a: unknown,
            b: unknown,
            c: unknown,
            d: unknown,
            e: unknown,
            f: unknown,
            g: unknown
          ) {
            return call(module, id, self, [a, b, c, d, e, f, g], hints, sync)
          },
        }.invoke
      default:
        throw new Error('invalid SDK member arity')
    }
  }
  if (flags & 1) {
    switch (arity) {
      case 0:
        return {
          invoke() {
            return call(module, id, undefined, [], hints, sync)
          },
        }.invoke
      case 1:
        return {
          invoke(a: unknown) {
            return call(module, id, undefined, [a], hints, sync)
          },
        }.invoke
      case 2:
        return {
          invoke(a: unknown, b: unknown) {
            return call(module, id, undefined, [a, b], hints, sync)
          },
        }.invoke
      case 3:
        return {
          invoke(a: unknown, b: unknown, c: unknown) {
            return call(module, id, undefined, [a, b, c], hints, sync)
          },
        }.invoke
      case 4:
        return {
          invoke(a: unknown, b: unknown, c: unknown, d: unknown) {
            return call(module, id, undefined, [a, b, c, d], hints, sync)
          },
        }.invoke
      case 5:
        return {
          invoke(a: unknown, b: unknown, c: unknown, d: unknown, e: unknown) {
            return call(module, id, undefined, [a, b, c, d, e], hints, sync)
          },
        }.invoke
      case 6:
        return {
          invoke(a: unknown, b: unknown, c: unknown, d: unknown, e: unknown, f: unknown) {
            return call(module, id, undefined, [a, b, c, d, e, f], hints, sync)
          },
        }.invoke
      case 7:
        return {
          invoke(
            a: unknown,
            b: unknown,
            c: unknown,
            d: unknown,
            e: unknown,
            f: unknown,
            g: unknown
          ) {
            return call(module, id, undefined, [a, b, c, d, e, f, g], hints, sync)
          },
        }.invoke
      case 8:
        return {
          invoke(
            a: unknown,
            b: unknown,
            c: unknown,
            d: unknown,
            e: unknown,
            f: unknown,
            g: unknown,
            h: unknown
          ) {
            return call(module, id, undefined, [a, b, c, d, e, f, g, h], hints, sync)
          },
        }.invoke
      default:
        throw new Error('invalid SDK member arity')
    }
  }
  switch (arity) {
    case 0:
      return {
        invoke(this: unknown) {
          return call(module, id, this, [], hints, sync)
        },
      }.invoke
    case 1:
      return {
        invoke(this: unknown, a: unknown) {
          return call(module, id, this, [a], hints, sync)
        },
      }.invoke
    case 2:
      return {
        invoke(this: unknown, a: unknown, b: unknown) {
          return call(module, id, this, [a, b], hints, sync)
        },
      }.invoke
    case 3:
      return {
        invoke(this: unknown, a: unknown, b: unknown, c: unknown) {
          return call(module, id, this, [a, b, c], hints, sync)
        },
      }.invoke
    case 4:
      return {
        invoke(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown) {
          return call(module, id, this, [a, b, c, d], hints, sync)
        },
      }.invoke
    case 5:
      return {
        invoke(
          this: unknown,
          a: unknown,
          b: unknown,
          c: unknown,
          d: unknown,
          e: unknown
        ) {
          return call(module, id, this, [a, b, c, d, e], hints, sync)
        },
      }.invoke
    case 6:
      return {
        invoke(
          this: unknown,
          a: unknown,
          b: unknown,
          c: unknown,
          d: unknown,
          e: unknown,
          f: unknown
        ) {
          return call(module, id, this, [a, b, c, d, e, f], hints, sync)
        },
      }.invoke
    case 7:
      return {
        invoke(
          this: unknown,
          a: unknown,
          b: unknown,
          c: unknown,
          d: unknown,
          e: unknown,
          f: unknown,
          g: unknown
        ) {
          return call(module, id, this, [a, b, c, d, e, f, g], hints, sync)
        },
      }.invoke
    case 8:
      return {
        invoke(
          this: unknown,
          a: unknown,
          b: unknown,
          c: unknown,
          d: unknown,
          e: unknown,
          f: unknown,
          g: unknown,
          h: unknown
        ) {
          return call(module, id, this, [a, b, c, d, e, f, g, h], hints, sync)
        },
      }.invoke
    default:
      throw new Error('invalid SDK member arity')
  }
}

// registration stays at the end of the framework, after every class is ready.
export function defineSDKMembers(
  target: object,
  module: string,
  members: Member[],
  value = false
) {
  const properties: Record<string, number> = {}
  const methods: Record<
    string,
    { id: number; args?: (number | null)[]; hints?: (WireHint | null)[] }
  > = {}
  const retained = new Map<Member, PropertyDescriptor>()
  const prototype = value ? target : Reflect.get(target, 'prototype')
  const instanceDescriptors: PropertyDescriptorMap = Object.create(null)
  const staticDescriptors: PropertyDescriptorMap = Object.create(null)
  for (const member of members) {
    const [name, , flags = 0] = member
    if (!(flags & 32)) continue
    const object = value || flags & 1 ? target : prototype
    retained.set(member, Object.getOwnPropertyDescriptor(object, name)!)
    Reflect.deleteProperty(object, name)
  }
  for (const member of members) {
    const [name, id, flags = 0, arity = 0, hints, args] = member
    if (flags & 128) properties[name] = id
    if (flags & 256) {
      const entry: (typeof methods)[string] = { id }
      if (args) entry.args = args
      if (hints?.some(Boolean)) entry.hints = hints
      methods[name] = entry
    }
    const object = value || flags & 1 ? target : prototype
    const descriptors = value || flags & 1 ? staticDescriptors : instanceDescriptors
    if (flags & 32) {
      descriptors[name] = retained.get(member)!
      continue
    }
    const method = implementation(module, id, flags, arity, hints ?? undefined)
    Object.defineProperty(method, 'name', {
      value: `${flags & 2 ? 'get ' : flags & 4 ? 'set ' : ''}${name}`,
      configurable: true,
    })
    const descriptor: PropertyDescriptor = { configurable: true, enumerable: value }
    if (flags & 6) {
      const previous = descriptors[name] ?? Object.getOwnPropertyDescriptor(object, name)
      descriptor.get = flags & 2 ? method : previous?.get
      descriptor.set = flags & 4 ? method : previous?.set
    } else {
      descriptor.value = method
      descriptor.writable = true
    }
    descriptors[name] = descriptor
  }
  if (!value) Object.defineProperties(prototype, instanceDescriptors)
  Object.defineProperties(target, staticDescriptors)
  return { module, properties, ...(Object.keys(methods).length ? { methods } : {}) }
}
