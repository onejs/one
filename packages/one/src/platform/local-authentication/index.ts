import type { LocalAuthenticationStatus } from '../specs/OneLocalAuthentication.nitro'

export type { LocalAuthenticationStatus }

function unavailable(): never {
  throw new Error('LocalAuthentication requires an iOS native build')
}

export const LocalAuthentication = Object.freeze({
  canEvaluatePolicy: (): LocalAuthenticationStatus => unavailable(),
  evaluatePolicy: (_reason: string): Promise<boolean> => unavailable(),
})
