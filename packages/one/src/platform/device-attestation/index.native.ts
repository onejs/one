import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import { rethrowNativeError } from '../nativeError'
import type { DeviceAttestationAvailability, OneDeviceAttestation } from '../specs/OneDeviceAttestation.nitro'
import { DeviceAttestation as unavailableDeviceAttestation } from './unavailable'

export type { DeviceAttestationAvailability } from '../specs/OneDeviceAttestation.nitro'

let hybrid: OneDeviceAttestation | undefined

function native(): OneDeviceAttestation {
  if (Platform.OS !== 'ios') throw new Error('DeviceAttestation requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneDeviceAttestation>('OneDeviceAttestation')
  return hybrid
}

function getAvailability(): DeviceAttestationAvailability {
  try {
    return native().getAvailability()
  } catch (error) {
    return rethrowNativeError(error)
  }
}

function generateKey(): Promise<string> {
  return native().generateKey().catch(rethrowNativeError)
}

function attestKey(keyId: string, clientDataHashBase64: string): Promise<string> {
  return native().attestKey(keyId, clientDataHashBase64).catch(rethrowNativeError)
}

function generateAssertion(keyId: string, clientDataHashBase64: string): Promise<string> {
  return native().generateAssertion(keyId, clientDataHashBase64).catch(rethrowNativeError)
}

function generateDeviceToken(): Promise<string> {
  return native().generateDeviceToken().catch(rethrowNativeError)
}

const nativeDeviceAttestation = Object.freeze({
  getAvailability, generateKey, attestKey, generateAssertion, generateDeviceToken,
})

// App Attest and DeviceCheck are iOS only, so Android keeps the unavailable contract
export const DeviceAttestation: typeof nativeDeviceAttestation =
  Platform.OS === 'android' ? unavailableDeviceAttestation : nativeDeviceAttestation
