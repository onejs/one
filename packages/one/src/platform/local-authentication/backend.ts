import { NitroModules } from 'react-native-nitro-modules'
import type { OneLocalAuthentication } from '../specs/OneLocalAuthentication.nitro'

let hybrid: OneLocalAuthentication | undefined

export function localAuthenticationNative(): OneLocalAuthentication {
  hybrid ??= NitroModules.createHybridObject<OneLocalAuthentication>('OneLocalAuthentication')
  return hybrid
}
