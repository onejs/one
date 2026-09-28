import type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro'

export type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro'

const unsupported = (): never => {
  throw new Error('DeviceAttestation requires an iOS native build')
}

export const DeviceAttestation = Object.freeze({
  getAvailability: (): DeviceAttestationAvailability => unsupported(),
  generateKey: (): Promise<string> => unsupported(),
  attestKey: (_keyId: string, _clientDataHashBase64: string): Promise<string> => unsupported(),
  generateAssertion: (_keyId: string, _clientDataHashBase64: string): Promise<string> => unsupported(),
  generateDeviceToken: (): Promise<string> => unsupported(),
})
