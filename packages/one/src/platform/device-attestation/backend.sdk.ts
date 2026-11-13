import { DCAppAttestService, DCDevice } from 'one/ios/DeviceCheck'
import {
  CharacterSet, Data, NSData, NSError, NSMaxRange, NSString, NSUTF8StringEncoding,
} from 'one/ios/Foundation'
import type { NativeError } from 'one/ios-runtime'

function failure(code: string, message: string): Error {
  return Object.assign(new Error(message), { code })
}

function unavailable(): Error {
  return failure('E_DEVICE_ATTESTATION_UNAVAILABLE', 'App Attest is unavailable on this device')
}

function validKey(keyId: string): boolean {
  const key = NSString.initString(keyId)
  if (!key.trimmingCharacters(CharacterSet.whitespacesAndNewlines)) return false
  if (key.length <= 1024) return true
  // match Swift's Character count for keys containing composed characters.
  let index = 0
  let count = 0
  while (index < key.length && count <= 1024) {
    index = NSMaxRange(key.rangeOfComposedCharacterSequence(index))
    count++
  }
  return count <= 1024
}

function validatedHash(keyId: string, hashBase64: string): ArrayBuffer | null {
  if (!validKey(keyId)) return null
  const encoded = NSString.initString(hashBase64).dataUsing(NSUTF8StringEncoding)
  const hash = encoded ? Data.initBase64EncodedOptions(encoded) : null
  if (!hash || hash.byteLength !== 32 || NSData.initData(hash).base64EncodedString() !== hashBase64) {
    return null
  }
  return hash
}

function dataResult(
  code: string,
  invoke: (callback: (data: ArrayBuffer | null, error: NativeError | null) => void) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    invoke((data, error) => {
      if (error) reject(failure(code, new NSError(error.$handle).localizedDescription))
      else if (data) resolve(NSData.initData(data).base64EncodedString())
      else reject(failure(code, 'DeviceCheck returned no data'))
    })
  })
}

const backend = {
  getAvailability() {
    return {
      appAttest: DCAppAttestService.shared.isSupported,
      deviceCheck: DCDevice.current.isSupported,
    }
  },
  async generateKey(): Promise<string> {
    const service = DCAppAttestService.shared
    if (!service.isSupported) throw unavailable()
    return new Promise((resolve, reject) => {
      service.generateKey((keyId, error) => {
        if (error) reject(failure('E_DEVICE_ATTESTATION_GENERATE', new NSError(error.$handle).localizedDescription))
        else if (keyId !== null) resolve(keyId)
        else reject(failure('E_DEVICE_ATTESTATION_GENERATE', 'App Attest returned no key identifier'))
      })
    })
  },
  async attestKey(keyId: string, clientDataHashBase64: string): Promise<string> {
    const hash = validatedHash(keyId, clientDataHashBase64)
    if (!hash) throw failure('E_DEVICE_ATTESTATION_INPUT', 'attestKey requires a key identifier and a base64 SHA-256 client data hash')
    const service = DCAppAttestService.shared
    if (!service.isSupported) throw unavailable()
    return dataResult('E_DEVICE_ATTESTATION_ATTEST', (callback) => service.attestKey(keyId, hash, callback))
  },
  async generateAssertion(keyId: string, clientDataHashBase64: string): Promise<string> {
    const hash = validatedHash(keyId, clientDataHashBase64)
    if (!hash) throw failure('E_DEVICE_ATTESTATION_INPUT', 'generateAssertion requires a key identifier and a base64 SHA-256 client data hash')
    const service = DCAppAttestService.shared
    if (!service.isSupported) throw unavailable()
    return dataResult('E_DEVICE_ATTESTATION_ASSERTION', (callback) => service.generateAssertion(keyId, hash, callback))
  },
  async generateDeviceToken(): Promise<string> {
    const device = DCDevice.current
    if (!device.isSupported) {
      throw failure('E_DEVICE_ATTESTATION_UNAVAILABLE', 'DeviceCheck is unavailable on this device')
    }
    return dataResult('E_DEVICE_ATTESTATION_TOKEN', (callback) => device.generateToken(callback))
  },
}

export function deviceAttestationNative() {
  return backend
}
