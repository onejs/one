import { callSDK, callSDKAsync, registerSDKFramework, type WireHint } from './wire'

export function defineSDKFramework(
  target: object,
  framework: string,
  names: string[],
  exported: number[],
  classes: number[],
  extensions: number[],
  protocols: number[],
  initialize: (module: { exports: (() => unknown)[] }, exports: (() => unknown)[]) => void
) {
  const module = { exports: [] as (() => unknown)[] }
  const ensure = registerSDKFramework(
    framework,
    classes.map((i) => names[i]),
    extensions.map((i) => names[i]),
    protocols.map((i) => names[i]),
    () => initialize(module, module.exports)
  )
  // metro refresh skips accessors on commonjs namespaces. keep them lazy.
  for (let index = 0; index < exported.length; index++) {
    const name = names[exported[index]]
    Object.defineProperty(target, name, {
      enumerable: true,
      get() {
        ensure()
        return module.exports[index]?.()
      },
    })
  }
}

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
  name: string,
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
        method(a: unknown) {
          call(module, id, undefined, [a], hints, sync)
        },
      }.method
    return {
      method(this: unknown, a: unknown) {
        call(module, id, this, [a], hints, sync)
      },
    }.method
  }
  if (flags & 64) {
    switch (arity) {
      case 1:
        return {
          method(self: unknown) {
            return call(module, id, self, [], hints, sync)
          },
        }.method
      case 2:
        return {
          method(self: unknown, a: unknown) {
            return call(module, id, self, [a], hints, sync)
          },
        }.method
      case 3:
        return {
          method(self: unknown, a: unknown, b: unknown) {
            return call(module, id, self, [a, b], hints, sync)
          },
        }.method
      case 4:
        return {
          method(self: unknown, a: unknown, b: unknown, c: unknown) {
            return call(module, id, self, [a, b, c], hints, sync)
          },
        }.method
      case 5:
        return {
          method(self: unknown, a: unknown, b: unknown, c: unknown, d: unknown) {
            return call(module, id, self, [a, b, c, d], hints, sync)
          },
        }.method
      case 6:
        return {
          method(
            self: unknown,
            a: unknown,
            b: unknown,
            c: unknown,
            d: unknown,
            e: unknown
          ) {
            return call(module, id, self, [a, b, c, d, e], hints, sync)
          },
        }.method
      case 7:
        return {
          method(
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
        }.method
      case 8:
        return {
          method(
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
        }.method
      default:
        throw new Error('invalid SDK member arity')
    }
  }
  if (flags & 1) {
    switch (arity) {
      case 0:
        return {
          method() {
            return call(module, id, undefined, [], hints, sync)
          },
        }.method
      case 1:
        return {
          method(a: unknown) {
            return call(module, id, undefined, [a], hints, sync)
          },
        }.method
      case 2:
        return {
          method(a: unknown, b: unknown) {
            return call(module, id, undefined, [a, b], hints, sync)
          },
        }.method
      case 3:
        return {
          method(a: unknown, b: unknown, c: unknown) {
            return call(module, id, undefined, [a, b, c], hints, sync)
          },
        }.method
      case 4:
        return {
          method(a: unknown, b: unknown, c: unknown, d: unknown) {
            return call(module, id, undefined, [a, b, c, d], hints, sync)
          },
        }.method
      case 5:
        return {
          method(a: unknown, b: unknown, c: unknown, d: unknown, e: unknown) {
            return call(module, id, undefined, [a, b, c, d, e], hints, sync)
          },
        }.method
      case 6:
        return {
          method(a: unknown, b: unknown, c: unknown, d: unknown, e: unknown, f: unknown) {
            return call(module, id, undefined, [a, b, c, d, e, f], hints, sync)
          },
        }.method
      case 7:
        return {
          method(
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
        }.method
      case 8:
        return {
          method(
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
        }.method
      default:
        throw new Error('invalid SDK member arity')
    }
  }
  switch (arity) {
    case 0:
      return {
        method(this: unknown) {
          return call(module, id, this, [], hints, sync)
        },
      }.method
    case 1:
      return {
        method(this: unknown, a: unknown) {
          return call(module, id, this, [a], hints, sync)
        },
      }.method
    case 2:
      return {
        method(this: unknown, a: unknown, b: unknown) {
          return call(module, id, this, [a, b], hints, sync)
        },
      }.method
    case 3:
      return {
        method(this: unknown, a: unknown, b: unknown, c: unknown) {
          return call(module, id, this, [a, b, c], hints, sync)
        },
      }.method
    case 4:
      return {
        method(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown) {
          return call(module, id, this, [a, b, c, d], hints, sync)
        },
      }.method
    case 5:
      return {
        method(
          this: unknown,
          a: unknown,
          b: unknown,
          c: unknown,
          d: unknown,
          e: unknown
        ) {
          return call(module, id, this, [a, b, c, d, e], hints, sync)
        },
      }.method
    case 6:
      return {
        method(
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
      }.method
    case 7:
      return {
        method(
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
      }.method
    case 8:
      return {
        method(
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
      }.method
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
  const ownDescriptors: PropertyDescriptorMap = Object.create(null)
  const prototypeDescriptors: PropertyDescriptorMap = Object.create(null)
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
    const descriptors = object === target ? ownDescriptors : prototypeDescriptors
    if (flags & 32) {
      descriptors[name] = retained.get(member)!
      continue
    }
    const method = implementation(
      `${flags & 2 ? 'get ' : flags & 4 ? 'set ' : ''}${name}`,
      module,
      id,
      flags,
      arity,
      hints ?? undefined
    )
    Object.defineProperty(method, 'name', {
      value: `${flags & 2 ? 'get ' : flags & 4 ? 'set ' : ''}${name}`,
    })
    const descriptor: PropertyDescriptor = { configurable: true, enumerable: value }
    if (flags & 6) {
      const previous = descriptors[name] ?? Object.getOwnPropertyDescriptor(object, name)
      // the generator emits zero arguments for getters and one for setters.
      descriptor.get = flags & 2 ? (method as () => unknown) : previous?.get
      descriptor.set = flags & 4 ? (method as (value: unknown) => void) : previous?.set
    } else {
      descriptor.value = method
      descriptor.writable = true
    }
    descriptors[name] = descriptor
  }
  Object.defineProperties(target, ownDescriptors)
  if (!value) Object.defineProperties(prototype, prototypeDescriptors)
  return { module, properties, ...(Object.keys(methods).length ? { methods } : {}) }
}
