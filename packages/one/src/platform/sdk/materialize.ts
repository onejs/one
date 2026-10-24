import { callSDK, callSDKAsync, type SDKHandle, type WireHint } from './wire'

type Member = [name: string, id: number, flags: number, arity: number, hints?: (WireHint | null)[]]

// fixed arities keep the generated call's argument slots and ignore extra args.
// these are methods so they remain nonconstructible, like class methods.
function implementation(module: string, id: number, flags: number, arity: number, hints?: (WireHint | null)[]) {
  const call = flags & 8 ? callSDKAsync : callSDK
  const sync = !!(flags & 16)
  const method = (() => {
    switch (arity) {
      case 0: return { invoke(this: unknown) { return call(module, id, this, [], hints, sync) } }.invoke
      case 1: return { invoke(this: unknown, a: unknown) { return call(module, id, this, [a], hints, sync) } }.invoke
      case 2: return { invoke(this: unknown, a: unknown, b: unknown) { return call(module, id, this, [a, b], hints, sync) } }.invoke
      case 3: return { invoke(this: unknown, a: unknown, b: unknown, c: unknown) { return call(module, id, this, [a, b, c], hints, sync) } }.invoke
      case 4: return { invoke(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown) { return call(module, id, this, [a, b, c, d], hints, sync) } }.invoke
      case 5: return { invoke(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown, e: unknown) { return call(module, id, this, [a, b, c, d, e], hints, sync) } }.invoke
      case 6: return { invoke(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown, e: unknown, f: unknown) { return call(module, id, this, [a, b, c, d, e, f], hints, sync) } }.invoke
      case 7: return { invoke(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown, e: unknown, f: unknown, g: unknown) { return call(module, id, this, [a, b, c, d, e, f, g], hints, sync) } }.invoke
      case 8: return { invoke(this: unknown, a: unknown, b: unknown, c: unknown, d: unknown, e: unknown, f: unknown, g: unknown, h: unknown) { return call(module, id, this, [a, b, c, d, e, f, g, h], hints, sync) } }.invoke
      default: throw new Error('invalid SDK member arity')
    }
  })()

  return flags & 1 ? method.bind(undefined) : method
}

// registration stays at the end of the framework, after every class is ready.
export function defineSDKMembers(target: typeof SDKHandle, module: string, members: Member[]) {
  for (const [name, id, flags, arity, hints] of members) {
    const object = flags & 1 ? target : target.prototype
    const method = implementation(module, id, flags, arity, hints)
    Object.defineProperty(method, 'name', { value: `${flags & 2 ? 'get ' : flags & 4 ? 'set ' : ''}${name}`, configurable: true })
    const descriptor: PropertyDescriptor = { configurable: true, enumerable: false }
    if (flags & 6) {
      const previous = Object.getOwnPropertyDescriptor(object, name)
      descriptor.get = flags & 2 ? method : previous?.get
      descriptor.set = flags & 4 ? method : previous?.set
    } else {
      descriptor.value = method
      descriptor.writable = true
    }
    Object.defineProperty(object, name, descriptor)
  }
}
