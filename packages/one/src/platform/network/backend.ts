import { NitroModules } from 'react-native-nitro-modules'
import type { OneNetwork } from '../specs/OneNetwork.nitro'

let hybrid: OneNetwork | undefined

export function networkNative(): OneNetwork {
  hybrid ??= NitroModules.createHybridObject<OneNetwork>('OneNetwork')
  return hybrid
}
