import { NitroModules } from 'react-native-nitro-modules'
import type { OneShare } from '../specs/OneShare.nitro'

let hybrid: OneShare | undefined

export function shareNative(): OneShare {
  hybrid ??= NitroModules.createHybridObject<OneShare>('OneShare')
  return hybrid
}
