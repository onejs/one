import { NitroModules } from 'react-native-nitro-modules'
import type { OneZero } from '../../platform/specs/OneZero.nitro'
import { NativeZero } from './client'
import type { NativeZeroOptions } from './client'
import type { Mutators } from './types'

export async function createNativeZero<M extends Mutators>(
  options: Omit<NativeZeroOptions<M>, 'engine'> & { name: string; clientID?: string }
): Promise<NativeZero<M>> {
  const engine = NitroModules.createHybridObject<OneZero>('OneZero')
  const client = new NativeZero({ ...options, engine })
  await engine.open(options.name, JSON.stringify(options.schema), options.clientID ?? '')
  await client.ready()
  return client
}
