import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type {
  LocalAuthenticationStatus,
  OneLocalAuthentication,
} from '../specs/OneLocalAuthentication.nitro'

export type { LocalAuthenticationStatus }

let hybrid: OneLocalAuthentication | undefined

function native(): OneLocalAuthentication {
  if (Platform.OS !== 'ios') {
    throw new Error('LocalAuthentication requires an iOS native build')
  }
  hybrid ??= NitroModules.createHybridObject<OneLocalAuthentication>('OneLocalAuthentication')
  return hybrid
}

function canEvaluatePolicy(): LocalAuthenticationStatus {
  try {
    return native().canEvaluatePolicy()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function evaluatePolicy(reason: string): Promise<boolean> {
  return native().evaluatePolicy(reason).catch(rethrowNativeError)
}

export const LocalAuthentication = Object.freeze({ canEvaluatePolicy, evaluatePolicy })
