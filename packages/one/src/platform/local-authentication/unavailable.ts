import { missingNativeBuild } from '../nativeError'
import type { LocalAuthenticationStatus } from '../specs/OneLocalAuthentication.nitro'

export type { LocalAuthenticationStatus }

export const LocalAuthentication = Object.freeze({
  canEvaluatePolicy: (): LocalAuthenticationStatus => ({
    available: false,
    biometryType: 'none',
  }),
  evaluatePolicy: (_reason: string): Promise<boolean> =>
    Promise.reject(missingNativeBuild('LocalAuthentication.evaluatePolicy')),
})
