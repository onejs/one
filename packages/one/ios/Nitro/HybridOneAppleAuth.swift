import AuthenticationServices
import NitroModules
import React
import UIKit

// native sign in with apple replacing expo-apple-authentication.
// uses ASAuthorizationController + ASAuthorizationAppleIDProvider.
final class HybridOneAppleAuth: HybridOneAppleAuthSpec {
  private var activeAuthDelegate: AppleAuthSessionDelegate?

  func isAvailable() throws -> Bool {
    return true
  }

  func signIn(options: AppleAuthSignInOptions) throws -> Promise<AppleAuthCredential> {
    let promise = Promise<AppleAuthCredential>()
    DispatchQueue.main.async {
      let appleIDProvider = ASAuthorizationAppleIDProvider()
      let request = appleIDProvider.createRequest()

      if let scopes = options.requestedScopes {
        request.requestedScopes = scopes.compactMap { scope in
          switch scope {
          case "fullName": return .fullName
          case "email": return .email
          default: return nil
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

  func getCredentialState(user: String) throws -> Promise<Double> {
    let promise = Promise<Double>()
    let appleIDProvider = ASAuthorizationAppleIDProvider()
    appleIDProvider.getCredentialState(forUserID: user) { state, error in
      if let error {
        promise.reject(withError: oneNativeError("ERR_REQUEST_FAILED", error.localizedDescription))
        return
      }
      let rawState: Double
      switch state {
      case .revoked:
        rawState = 0
      case .authorized:
        rawState = 1
      case .notFound:
        rawState = 2
      case .transferred:
        rawState = 3
      @unknown default:
        rawState = 2
      }
      promise.resolve(withResult: rawState)
    }
    return promise
  }
}

private final class AppleAuthSessionDelegate: NSObject, ASAuthorizationControllerDelegate,
  ASAuthorizationControllerPresentationContextProviding
{
  private let promise: Promise<AppleAuthCredential>
  private let onFinished: () -> Void

  init(promise: Promise<AppleAuthCredential>, onFinished: @escaping () -> Void) {
    self.promise = promise
    self.onFinished = onFinished
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    if let window = UIApplication.shared.connectedScenes
      .compactMap({ $0 as? UIWindowScene })
      .flatMap({ $0.windows })
      .first(where: { $0.isKeyWindow }) {
      return window
    }
    return RCTKeyWindow() ?? ASPresentationAnchor()
  }

  func authorizationController(
    controller: ASAuthorizationController,
    didCompleteWithAuthorization authorization: ASAuthorization
  ) {
    defer { onFinished() }
    guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential else {
      promise.reject(withError: oneNativeError("ERR_REQUEST_FAILED", "Unexpected credential received."))
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

    let realUserStatus: Double
    switch credential.realUserStatus {
    case .unsupported:
      realUserStatus = 0
    case .unknown:
      realUserStatus = 1
    case .likelyReal:
      realUserStatus = 2
    @unknown default:
      realUserStatus = 0
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
    promise.resolve(withResult: result)
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
      promise.reject(
        withError: oneNativeError("ERR_REQUEST_CANCELED", "The user canceled the authorization request."))
    } else {
      promise.reject(
        withError: oneNativeError("ERR_REQUEST_FAILED", error.localizedDescription))
    }
  }
}
