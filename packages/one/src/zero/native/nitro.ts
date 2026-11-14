import { NitroModules } from 'react-native-nitro-modules'
import type { OneZero } from '../../platform/specs/OneZero.nitro'
import { NativeZero } from './client'
import type { NativeZeroOptions } from './client'

export async function createNativeZero(
  options: Omit<NativeZeroOptions, 'engine'> & { name: string; clientID?: string }
): Promise<NativeZero> {
  const engine = NitroModules.createHybridObject<OneZero>('OneZero')
  const client = new NativeZero({ ...options, engine })
  await engine.open(options.name, JSON.stringify(options.schema), options.clientID ?? '')
  return client
}
