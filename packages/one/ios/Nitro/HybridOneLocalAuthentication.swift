import LocalAuthentication
import NitroModules

final class HybridOneLocalAuthentication: HybridOneLocalAuthenticationSpec {
  func canEvaluatePolicy() throws -> LocalAuthenticationStatus {
    let context = LAContext()
    var error: NSError?
    let available = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    let type: LocalBiometryType
    switch context.biometryType {
    case .touchID: type = .touchid
    case .faceID: type = .faceid
    case .opticID: type = .opticid
    case .none: type = .none
    @unknown default: type = .none
    }
    return LocalAuthenticationStatus(
      available: available,
      biometryType: type,
      errorCode: error.map { Double($0.code) }
    )
  }

  func evaluatePolicy(reason: String) throws -> Promise<Bool> {
    let promise = Promise<Bool>()
    guard !reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      promise.reject(
        withError: oneNativeError("E_LOCAL_AUTH_REASON", "LocalAuthentication.evaluatePolicy: reason is required"))
      return promise
    }
    let context = LAContext()
    context.localizedFallbackTitle = ""
    var policyError: NSError?
    _ = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &policyError)
    if context.biometryType == .faceID &&
      !(Bundle.main.object(forInfoDictionaryKey: "NSFaceIDUsageDescription") is String)
    {
      promise.reject(
        withError: oneNativeError(
          "E_LOCAL_AUTH_MANIFEST",
          "LocalAuthentication.evaluatePolicy: set native.app.ios.faceIdUsageDescription"))
      return promise
    }
    context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) {
      success, error in
      if success {
        promise.resolve(withResult: true)
        return
      }
      let failure = error as? LAError
      if failure?.code == .userCancel || failure?.code == .appCancel ||
        failure?.code == .systemCancel || failure?.code == .userFallback
      {
        promise.resolve(withResult: false)
        return
      }
      let detail = error?.localizedDescription ?? "authentication failed"
      let code: String
      switch failure?.code {
      case .biometryLockout: code = "E_LOCAL_AUTH_LOCKOUT"
      case .biometryNotEnrolled: code = "E_LOCAL_AUTH_NOT_ENROLLED"
      case .passcodeNotSet: code = "E_LOCAL_AUTH_PASSCODE_NOT_SET"
      default: code = "E_LOCAL_AUTH_FAILED"
      }
      promise.reject(
        withError: oneNativeError(
          code, "LocalAuthentication.evaluatePolicy: \(detail)"))
    }
    return promise
  }
}
