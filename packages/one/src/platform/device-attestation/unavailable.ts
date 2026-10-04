import { missingNativeBuild } from '../nativeError'
import type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro'

export type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro'

export const DeviceAttestation = Object.freeze({
  getAvailability: (): DeviceAttestationAvailability => ({
    appAttest: false,
    deviceCheck: false,
  }),
  generateKey: (): Promise<string> =>
    Promise.reject(missingNativeBuild('DeviceAttestation.generateKey')),
  attestKey: (_keyId: string, _clientDataHashBase64: string): Promise<string> =>
    Promise.reject(missingNativeBuild('DeviceAttestation.attestKey')),
  generateAssertion: (_keyId: string, _clientDataHashBase64: string): Promise<string> =>
    Promise.reject(missingNativeBuild('DeviceAttestation.generateAssertion')),
  generateDeviceToken: (): Promise<string> =>
    Promise.reject(missingNativeBuild('DeviceAttestation.generateDeviceToken')),
})
