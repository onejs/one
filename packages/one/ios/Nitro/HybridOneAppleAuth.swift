import AuthenticationServices
import NitroModules
import React
import UIKit

// One.Auth.Apple: sign in with apple through ASAuthorizationController and
// ASAuthorizationAppleIDProvider, replacing expo-apple-authentication. a failure
// that is not a cancel carries the native error domain and code in its message.
final class HybridOneAppleAuth: HybridOneAppleAuthSpec {
  private var activeAuthDelegate: AppleAuthSessionDelegate?

  func isAvailable() throws -> Bool {
    return true
  }

  func signIn(options: AppleAuthSignInOptions) throws -> Promise<AppleAuthResult> {
    let promise = Promise<AppleAuthResult>()
    DispatchQueue.main.async {
      let appleIDProvider = ASAuthorizationAppleIDProvider()
      let request = appleIDProvider.createRequest()

      if let scopes = options.requestedScopes {
        request.requestedScopes = scopes.map { scope in
          switch scope {
          case .fullname: return .fullName
          case .email: return .email
          }
        }
      }

      if let nonce = options.nonce, !nonce.isEmpty {
        request.nonce = nonce
      }

      if let state = options.state, !state.isEmpty {
        request.state = state
      }

      let controller = ASAuthorizationController(authorizationRequests: [request])
      let delegate = AppleAuthSessionDelegate(promise: promise) { [weak self] in
        self?.activeAuthDelegate = nil
      }
      self.activeAuthDelegate = delegate
      controller.delegate = delegate
      controller.presentationContextProvider = delegate
      controller.performRequests()
    }
    return promise
  }

  func getCredentialState(user: String) throws -> Promise<AppleCredentialState> {
    let promise = Promise<AppleCredentialState>()
    ASAuthorizationAppleIDProvider().getCredentialState(forUserID: user) { state, error in
      if let error {
        promise.reject(
          withError: appleAuthError(
            "E_AUTH_CREDENTIAL_STATE", "Auth.Apple.getCredentialState", error))
        return
      }
      switch state {
      case .revoked: promise.resolve(withResult: .revoked)
      case .authorized: promise.resolve(withResult: .authorized)
      case .notFound: promise.resolve(withResult: .notfound)
      case .transferred: promise.resolve(withResult: .transferred)
      @unknown default:
        promise.reject(
          withError: oneNativeError(
            "E_AUTH_CREDENTIAL_STATE",
            "Auth.Apple.getCredentialState: unknown credential state \(state.rawValue)"))
      }
    }
    return promise
  }
}

// the native domain and code stay in the message, so a caller (and the
// conformance suite) can tell which AuthenticationServices failure it was.
private func appleAuthError(_ code: String, _ verb: String, _ error: Error) -> Error {
  let nsError = error as NSError
  return oneNativeError(
    code, "\(verb): \(nsError.domain) \(nsError.code): \(nsError.localizedDescription)")
}

private final class AppleAuthSessionDelegate: NSObject, ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding
{
  private let promise: Promise<AppleAuthResult>
  private let onFinished: () -> Void

  init(promise: Promise<AppleAuthResult>, onFinished: @escaping () -> Void) {
    self.promise = promise
    self.onFinished = onFinished
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    return RCTKeyWindow() ?? ASPresentationAnchor()
  }

  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    defer { onFinished() }
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
      promise.reject(
        withError: oneNativeError(
          "E_AUTH_SIGN_IN", "Auth.Apple.signIn: the credential is not an Apple ID credential"))
      return
    }

    let identityTokenString = credential.identityToken.flatMap { String(data: $0, encoding: .utf8) }
    let authorizationCodeString = credential.authorizationCode.flatMap { String(data: $0, encoding: .utf8) }

    var fullName: AppleAuthFullName? = nil
    if let name = credential.fullName {
      fullName = AppleAuthFullName(
        namePrefix: name.namePrefix,
        givenName: name.givenName,
        middleName: name.middleName,
        familyName: name.familyName,
        nameSuffix: name.nameSuffix,
        nickname: name.nickname
      )
    }

    let realUserStatus: AppleRealUserStatus
    switch credential.realUserStatus {
    case .likelyReal: realUserStatus = .likelyreal
    case .unknown: realUserStatus = .unknown
    default: realUserStatus = .unsupported
    }

    let result = AppleAuthCredential(
      user: credential.user,
      state: credential.state,
      identityToken: identityTokenString,
      authorizationCode: authorizationCodeString,
      email: credential.email,
      fullName: fullName,
      realUserStatus: realUserStatus
    )
    promise.resolve(withResult: AppleAuthResult(type: .success, credential: result))
  }

  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithError error: Error
  ) {
    defer { onFinished() }
    let nsError = error as NSError
    if nsError.domain == ASAuthorizationErrorDomain,
      nsError.code == ASAuthorizationError.Code.canceled.rawValue
    {
      promise.resolve(withResult: AppleAuthResult(type: .cancel, credential: nil))
    } else {
      promise.reject(withError: appleAuthError("E_AUTH_SIGN_IN", "Auth.Apple.signIn", error))
    }
  }
}
