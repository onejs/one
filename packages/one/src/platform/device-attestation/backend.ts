import { Platform } from 'react-native'
import { NitroModules } from 'react-native-nitro-modules'
import type { OneDeviceAttestation } from '../specs/OneDeviceAttestation.nitro'

let hybrid: OneDeviceAttestation | undefined

export function deviceAttestationNative(): OneDeviceAttestation {
  if (Platform.OS !== 'ios') throw new Error('DeviceAttestation requires an iOS native build')
  hybrid ??= NitroModules.createHybridObject<OneDeviceAttestation>('OneDeviceAttestation')
  return hybrid
}
