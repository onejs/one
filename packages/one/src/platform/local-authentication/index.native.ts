import type { localAuthenticationNative } from './backend'
import { rethrowNativeError } from '../nativeError'
import type {
  LocalAuthenticationStatus,
} from '../specs/OneLocalAuthentication.nitro'

// required on first use: the ios backend evaluates its framework bindings on load
const native: typeof localAuthenticationNative = () => require('./backend').localAuthenticationNative()

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
