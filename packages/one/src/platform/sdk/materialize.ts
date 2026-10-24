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
  Object.defineProperty(target, '__esModule', { value: true })
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
        [name](a: unknown) {
          call(module, id, undefined, [a], hints, sync)
        },
      }[name]
    return {
      [name](this: unknown, a: unknown) {
        call(module, id, this, [a], hints, sync)
      },
    }[name]
  }
  if (flags & 64) {
    switch (arity) {
      case 1:
        return {
          [name](self: unknown) {
            return call(module, id, self, [], hints, sync)
          },
        }[name]
      case 2:
        return {
          [name](self: unknown, a: unknown) {
            return call(module, id, self, [a], hints, sync)
          },
        }[name]
      case 3:
        return {
          [name](self: unknown, a: unknown, b: unknown) {
            return call(module, id, self, [a, b], hints, sync)
          },
        }[name]
      case 4:
        return {
          [name](self: unknown, a: unknown, b: unknown, c: unknown) {
            return call(module, id, self, [a, b, c], hints, sync)
          },
        }[name]
      case 5:
        return {
          [name](self: unknown, a: unknown, b: unknown, c: unknown, d: unknown) {
            return call(module, id, self, [a, b, c, d], hints, sync)
          },
        }[name]
      case 6:
        return {
          [name](
            self: unknown,
            a: unknown,
            b: unknown,
            c: unknown,
            d: unknown,
            e: unknown
          ) {
            return call(module, id, self, [a, b, c, d, e], hints, sync)
          },
        }[name]
      case 7:
        return {
          [name](
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
        }[name]
      case 8:
        return {
          [name](
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
        }[name]
      default:
        throw new Error('invalid SDK member arity')
    }
  }
  if (flags & 1) {
    switch (arity) {
      case 0:
        return {
          [name]() {
            return call(module, id, undefined, [], hints, sync)
          },
        }[name]
      case 1:
        return {
          [name](a: unknown) {
            return call(module, id, undefined, [a], hints, sync)
          },
        }[name]
      case 2:
        return {
          [name](a: unknown, b: unknown) {
            return call(module, id, undefined, [a, b], hints, sync)
          },
        }[name]
      case 3:
        return {
          [name](a: unknown, b: unknown, c: unknown) {
            return call(module, id, undefined, [a, b, c], hints, sync)
          },
        }[name]
      case 4:
        return {
          [name](a: unknown, b: unknown, c: unknown, d: unknown) {
            return call(module, id, undefined, [a, b, c, d], hints, sync)
          },
        }[name]
      case 5:
        return {
          [name](a: unknown, b: unknown, c: unknown, d: unknown, e: unknown) {
            return call(module, id, undefined, [a, b, c, d, e], hints, sync)
          },
        }[name]
      case 6:
        return {
          [name](a: unknown, b: unknown, c: unknown, d: unknown, e: unknown, f: unknown) {
            return call(module, id, undefined, [a, b, c, d, e, f], hints, sync)
          },
        }[name]
      case 7:
        return {
          [name](
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
        }[name]
      case 8:
        return {
          [name](
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
        }[name]
      default:
        throw new Error('invalid SDK member arity')
    }
  }
  switch (arity) {
    case 0:
      return {
        [name](this: unknown) {
          return call(module, id, this, [], hints, sync)
        },
      }[name]
    case 1:
      return {
        [name](this: unknown, a: unknown) {
          return call(module, id, this, [a], hints, sync)
        },
      }[name]
    case 2:
      return {
        [name](this: unknown, a: unknown, b: unknown) {
          return call(module, id, this, [a, b], hints, sync)
        },
      }[name]
    case 3:
      return {
        [name](this: unknown, a: unknown, b: unknown, c: unknown) {
          return call(module, id, this, [a, b, c], hints, sync)
        },
      }[name]
    case 4:
      return {
        [name](this: unknown, a: unknown, b: unknown, c: unknown, d: unknown) {
          return call(module, id, this, [a, b, c, d], hints, sync)
        },
      }[name]
    case 5:
      return {
        [name](
          this: unknown,
          a: unknown,
          b: unknown,
          c: unknown,
          d: unknown,
          e: unknown
        ) {
          return call(module, id, this, [a, b, c, d, e], hints, sync)
        },
      }[name]
    case 6:
      return {
        [name](
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
      }[name]
    case 7:
      return {
        [name](
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
      }[name]
    case 8:
      return {
        [name](
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
      }[name]
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
    if (flags & 32) {
      Object.defineProperty(object, name, retained.get(member)!)
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
    const descriptor: PropertyDescriptor = { configurable: true, enumerable: value }
    if (flags & 6) {
      const previous = Object.getOwnPropertyDescriptor(object, name)
      // the generator emits zero arguments for getters and one for setters.
      descriptor.get = flags & 2 ? (method as () => unknown) : previous?.get
      descriptor.set = flags & 4 ? (method as (value: unknown) => void) : previous?.set
    } else {
      descriptor.value = method
      descriptor.writable = true
    }
    Object.defineProperty(object, name, descriptor)
  }
  return { module, properties, ...(Object.keys(methods).length ? { methods } : {}) }
}
