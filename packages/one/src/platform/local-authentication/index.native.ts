import { localAuthenticationNative as native } from './backend'
import { rethrowNativeError } from '../nativeError'
import type {
  LocalAuthenticationStatus,
} from '../specs/OneLocalAuthentication.nitro'

export type { LocalAuthenticationStatus }

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
