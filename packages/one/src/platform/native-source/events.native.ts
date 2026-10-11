// native-to-js events for source-imported modules. generated subscription
// wrappers register the native closure through the module's own subscribe
// method, then listen on the module's channel. unsubscribing removes only
// the javascript listener; a stored native closure stays the author's
// lifecycle, like any other retained callback.
import { NativeEventEmitter, NativeModules } from 'react-native'
import { callNativeSource } from './index.native'
import type { NativeSourceStructs, NativeSourceWire } from './wire.native'
import { decodeNativeSourceCallback } from './wire.native'

const emitter = new NativeEventEmitter(NativeModules.OneNativeSourceEvents)

export function subscribeNativeSourceEvent(
  module: string,
  event: string,
  listener: (...args: never[]) => void,
  contractHash: string,
  payloadWires: (NativeSourceWire | null)[],
  structs: NativeSourceStructs
): () => void {
  if (typeof listener !== 'function') {
    throw new TypeError(`native event ${module}.${event} needs a listener function`)
  }
  const channel = `OneNativeSource.${module}.${event}`
  const subscription = emitter.addListener(channel, (args: unknown[]) => {
    listener(
      ...(decodeNativeSourceCallback(args, payloadWires, structs, event) as never[])
    )
  })
  // listen first so nothing the subscription registers can be lost, then
  // hand the native closure to the author's subscribe method. a rejected
  // subscribe (a stale binary, an unlinked module) surfaces the same way
  // any rejected native call does.
  callNativeSource(module, event, [], contractHash)
  return () => subscription.remove()
}
