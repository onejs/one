import {
  LAContext, LAError,
  kLAErrorUserCancel, kLAErrorAppCancel, kLAErrorSystemCancel, kLAErrorUserFallback,
  kLAErrorBiometryLockout, kLAErrorBiometryNotEnrolled, kLAErrorPasscodeNotSet,
} from 'one/ios/LocalAuthentication'
import { Bundle, NSError } from 'one/ios/Foundation'
import type { LocalAuthenticationStatus } from '../specs/OneLocalAuthentication.nitro'

const policy = 'deviceOwnerAuthenticationWithBiometrics'

function canEvaluatePolicy(): LocalAuthenticationStatus {
  const context = LAContext.init()
  const result = context.canEvaluatePolicy(policy)
  const type = context.biometryType
  return {
    available: result.$ret,
    biometryType: type === 'touchID' || type === 'faceID' || type === 'opticID' ? type : 'none',
    errorCode: result.$out.error?.code,
  }
}

function failure(code: string, detail: string): Error {
  return Object.assign(new Error(`LocalAuthentication.evaluatePolicy: ${detail}`), { code })
}

async function evaluatePolicy(reason: string): Promise<boolean> {
  if (!reason.trim()) throw failure('E_LOCAL_AUTH_REASON', 'reason is required')
  const context = LAContext.init()
  context.localizedFallbackTitle = ''
  context.canEvaluatePolicy(policy)
  if (context.biometryType === 'faceID' &&
      typeof Bundle.main.object('NSFaceIDUsageDescription') !== 'string') {
    throw failure('E_LOCAL_AUTH_MANIFEST', 'set native.app.ios.faceIdUsageDescription')
  }
  return new Promise((resolve, reject) => {
    context.evaluatePolicy(policy, reason, (success, error) => {
      if (success) { resolve(true); return }
      const nativeError = error ? new NSError(error.$handle) : null
      const errorCode = nativeError?.domain === LAError.errorDomain ? nativeError.code : undefined
      if (errorCode === kLAErrorUserCancel || errorCode === kLAErrorAppCancel ||
          errorCode === kLAErrorSystemCancel || errorCode === kLAErrorUserFallback) {
        resolve(false)
        return
      }
      const code = errorCode === kLAErrorBiometryLockout ? 'E_LOCAL_AUTH_LOCKOUT'
        : errorCode === kLAErrorBiometryNotEnrolled ? 'E_LOCAL_AUTH_NOT_ENROLLED'
        : errorCode === kLAErrorPasscodeNotSet ? 'E_LOCAL_AUTH_PASSCODE_NOT_SET'
        : 'E_LOCAL_AUTH_FAILED'
      reject(failure(code, nativeError?.localizedDescription ?? 'authentication failed'))
    })
  })
}

const backend = { canEvaluatePolicy, evaluatePolicy }

export function localAuthenticationNative() {
  return backend
}
