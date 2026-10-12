import DeviceCheck
import NitroModules

final class HybridOneDeviceAttestation: HybridOneDeviceAttestationSpec {
  func getAvailability() throws -> DeviceAttestationAvailability {
    DeviceAttestationAvailability(
      appAttest: DCAppAttestService.shared.isSupported,
      deviceCheck: DCDevice.current.isSupported)
  }

  func generateKey() throws -> Promise<String> {
    let promise = Promise<String>()
    guard DCAppAttestService.shared.isSupported else {
      promise.reject(withError: oneNativeError(
        "E_DEVICE_ATTESTATION_UNAVAILABLE", "App Attest is unavailable on this device"))
      return promise
    }
    DCAppAttestService.shared.generateKey { keyId, error in
      if let error {
        promise.reject(withError: oneNativeError(
          "E_DEVICE_ATTESTATION_GENERATE", error.localizedDescription))
      } else if let keyId {
        promise.resolve(withResult: keyId)
      } else {
        promise.reject(withError: oneNativeError(
          "E_DEVICE_ATTESTATION_GENERATE", "App Attest returned no key identifier"))
      }
    }
    return promise
  }

  func attestKey(keyId: String, clientDataHashBase64: String) throws -> Promise<String> {
    let promise = Promise<String>()
    guard let hash = validatedHash(keyId: keyId, hashBase64: clientDataHashBase64) else {
      promise.reject(withError: oneNativeError(
        "E_DEVICE_ATTESTATION_INPUT", "attestKey requires a key identifier and a base64 SHA-256 client data hash"))
      return promise
    }
    guard DCAppAttestService.shared.isSupported else {
      promise.reject(withError: oneNativeError(
        "E_DEVICE_ATTESTATION_UNAVAILABLE", "App Attest is unavailable on this device"))
      return promise
    }
    DCAppAttestService.shared.attestKey(keyId, clientDataHash: hash) { data, error in
      self.finish(data: data, error: error, code: "E_DEVICE_ATTESTATION_ATTEST", promise: promise)
    }
    return promise
  }

  func generateAssertion(keyId: String, clientDataHashBase64: String) throws -> Promise<String> {
    let promise = Promise<String>()
    guard let hash = validatedHash(keyId: keyId, hashBase64: clientDataHashBase64) else {
      promise.reject(withError: oneNativeError(
        "E_DEVICE_ATTESTATION_INPUT", "generateAssertion requires a key identifier and a base64 SHA-256 client data hash"))
      return promise
    }
    guard DCAppAttestService.shared.isSupported else {
      promise.reject(withError: oneNativeError(
        "E_DEVICE_ATTESTATION_UNAVAILABLE", "App Attest is unavailable on this device"))
      return promise
    }
    DCAppAttestService.shared.generateAssertion(keyId, clientDataHash: hash) { data, error in
      self.finish(data: data, error: error, code: "E_DEVICE_ATTESTATION_ASSERTION", promise: promise)
    }
    return promise
  }

  func generateDeviceToken() throws -> Promise<String> {
    let promise = Promise<String>()
    guard DCDevice.current.isSupported else {
      promise.reject(withError: oneNativeError(
        "E_DEVICE_ATTESTATION_UNAVAILABLE", "DeviceCheck is unavailable on this device"))
      return promise
    }
    DCDevice.current.generateToken { data, error in
      self.finish(data: data, error: error, code: "E_DEVICE_ATTESTATION_TOKEN", promise: promise)
    }
    return promise
  }

  private func validatedHash(keyId: String, hashBase64: String) -> Data? {
    guard !keyId.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty,
      keyId.count <= 1024,
      let data = Data(base64Encoded: hashBase64), data.count == 32,
      data.base64EncodedString() == hashBase64 else { return nil }
    return data
  }

  private func finish(
    data: Data?, error: Error?, code: String, promise: Promise<String>
  ) {
    if let error {
      promise.reject(withError: oneNativeError(code, error.localizedDescription))
    } else if let data {
      promise.resolve(withResult: data.base64EncodedString())
    } else {
      promise.reject(withError: oneNativeError(code, "DeviceCheck returned no data"))
    }
  }
}
