import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { OneNativeModules } from '../specs/OneNativeModules.nitro'

let hybrid: OneNativeModules | undefined

export function callNativeSource(
  module: string,
  method: string,
  args: unknown[],
  contractHash: string
): Promise<unknown> {
  hybrid ??= NitroModules.createHybridObject<OneNativeModules>('OneNativeModules')
  return hybrid.call(module, method, JSON.stringify(args), contractHash)
    .then((value) => JSON.parse(value))
    .catch((error: unknown) => {
      try {
        rethrowNativeError(error)
      } catch (coded) {
        if (coded instanceof Error) Object.assign(coded, { module, method })
        throw coded
      }
    })
}
