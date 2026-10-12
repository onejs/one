import MessageUI
import NitroModules
import UIKit

final class HybridOneMailCompose: HybridOneMailComposeSpec {
  private var controller: MFMailComposeViewController?
  private let presentation = OneUIKitPresentation()
  private let delegate = OneMailComposeDelegate()
  fileprivate var completion: ((MailComposeResult, DocumentCameraError?) -> Void)?

  override init() {
    super.init()
    delegate.owner = self
    presentation.onDismiss = { [weak self] in self?.finish(.cancelled, nil) }
  }

  private func composer() throws -> MFMailComposeViewController {
    precondition(Thread.isMainThread)
    guard MFMailComposeViewController.canSendMail() else {
      throw oneNativeError("E_MAIL_COMPOSE_UNAVAILABLE", "Mail is not configured on this device")
    }
    if let controller { return controller }
    let result = MFMailComposeViewController()
    result.mailComposeDelegate = delegate
    controller = result
    return result
  }

  func canSendMail() throws -> Bool { oneUIKitOnMain { MFMailComposeViewController.canSendMail() } }
  func setSubject(subject: String) throws { try oneUIKitOnMain { try composer().setSubject(subject) } }
  func setToRecipients(recipients: [String]) throws { try oneUIKitOnMain { try composer().setToRecipients(recipients) } }
  func setCcRecipients(recipients: [String]) throws { try oneUIKitOnMain { try composer().setCcRecipients(recipients) } }
  func setBccRecipients(recipients: [String]) throws { try oneUIKitOnMain { try composer().setBccRecipients(recipients) } }
  func setMessageBody(body: String, isHTML: Bool) throws { try oneUIKitOnMain { try composer().setMessageBody(body, isHTML: isHTML) } }
  func setPreferredSendingEmailAddress(emailAddress: String) throws { try oneUIKitOnMain { try composer().setPreferredSendingEmailAddress(emailAddress) } }
  func addAttachmentData(attachment: ArrayBuffer, mimeType: String, fileName: String) throws {
    try oneUIKitOnMain { try composer().addAttachmentData(attachment.toData(copyIfNeeded: true), mimeType: mimeType, fileName: fileName) }
  }
  func present(animated: Bool, didFinish: @escaping (MailComposeResult, DocumentCameraError?) -> Void) throws -> Promise<Void> {
    // enqueue to keep all presentation failures on the promise channel.
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        let composer = try self.composer()
        let inner = try self.presentation.present(composer, owner: self, animated: animated)
        self.completion = didFinish
        inner.then { promise.resolve(withResult: ()) }.catch { promise.reject(withError: $0) }
      } catch { promise.reject(withError: error) }
    }
    return promise
  }
  func dismiss(animated: Bool) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        try self.presentation.dismiss(animated: animated).then {
          self.completion = nil
          promise.resolve(withResult: ())
        }.catch { promise.reject(withError: $0) }
      } catch { promise.reject(withError: error) }
    }
    return promise
  }
  fileprivate func finish(_ result: MailComposeResult, _ error: Error?) {
    let callback = completion
    completion = nil
    let failure = error.map { $0 as NSError }
    callback?(result, failure.map { DocumentCameraError(domain: $0.domain, code: Double($0.code), localizedDescription: $0.localizedDescription) })
  }
}

final class OneMailComposeDelegate: NSObject, MFMailComposeViewControllerDelegate {
  weak var owner: HybridOneMailCompose?
  func mailComposeController(_ controller: MFMailComposeViewController, didFinishWith result: MFMailComposeResult, error: Error?) {
    let value: MailComposeResult
    switch result {
    case .cancelled: value = .cancelled
    case .saved: value = .saved
    case .sent: value = .sent
    case .failed: value = .failed
    @unknown default: value = .failed
    }
    owner?.finish(value, error)
  }
}
