#if ONE_GROUP_MESSAGING
import MessageUI
import NitroModules
import UIKit

final class HybridOneMessageCompose: HybridOneMessageComposeSpec {
  private var controller: MFMessageComposeViewController?
  private var initialRecipients: [String]?
  private var initialBody: String?
  private var initialSubject: String?
  private let presentation = OneUIKitPresentation()
  private let delegate = OneMessageComposeDelegate()
  fileprivate var completion: ((MessageComposeResult) -> Void)?

  override init() {
    super.init()
    delegate.owner = self
    presentation.onDismiss = { [weak self] in self?.finish(.cancelled) }
  }
  private func composer() throws -> MFMessageComposeViewController {
    precondition(Thread.isMainThread)
    guard MFMessageComposeViewController.canSendText() else {
      throw oneNativeError("E_MESSAGE_COMPOSE_UNAVAILABLE", "Messages cannot be sent on this device")
    }
    if let controller { return controller }
    let result = MFMessageComposeViewController()
    result.messageComposeDelegate = delegate
    result.recipients = initialRecipients
    result.body = initialBody
    result.subject = initialSubject
    controller = result
    return result
  }
  func canSendText() throws -> Bool { oneUIKitOnMain { MFMessageComposeViewController.canSendText() } }
  func canSendAttachments() throws -> Bool { oneUIKitOnMain { MFMessageComposeViewController.canSendAttachments() } }
  func canSendSubject() throws -> Bool { oneUIKitOnMain { MFMessageComposeViewController.canSendSubject() } }
  func isSupportedAttachmentUTI(uti: String) throws -> Bool { oneUIKitOnMain { MFMessageComposeViewController.isSupportedAttachmentUTI(uti) } }
  var recipients: [String]? {
    get { oneUIKitOnMain { if let controller { return controller.recipients }; return initialRecipients } }
    set { oneUIKitOnMain { initialRecipients = newValue; controller?.recipients = newValue } }
  }
  var body: String? {
    get { oneUIKitOnMain { if let controller { return controller.body }; return initialBody } }
    set { oneUIKitOnMain { initialBody = newValue; controller?.body = newValue } }
  }
  var subject: String? {
    get { oneUIKitOnMain { if let controller { return controller.subject }; return initialSubject } }
    set { oneUIKitOnMain { initialSubject = newValue; controller?.subject = newValue } }
  }
  var attachments: [MessageAttachment] {
    oneUIKitOnMain {
      (controller?.attachments ?? []).compactMap { item in
        guard let url = item[MFMessageComposeViewControllerAttachmentURL] as? URL else { return nil }
        return MessageAttachment(attachmentURL: url.absoluteString,
          attachmentAlternateFilename: item[MFMessageComposeViewControllerAttachmentAlternateFilename] as? String)
      }
    }
  }
  func disableUserAttachments() throws { try oneUIKitOnMain { try composer().disableUserAttachments() } }
  func addAttachmentData(attachment: ArrayBuffer, typeIdentifier: String, filename: String) throws -> Bool {
    try oneUIKitOnMain { try composer().addAttachmentData(attachment.toData(copyIfNeeded: true), typeIdentifier: typeIdentifier, filename: filename) }
  }
  func addAttachmentURL(attachmentURL: String, withAlternateFilename: String?) throws -> Bool {
    try oneUIKitOnMain {
      guard let url = URL(string: attachmentURL), url.isFileURL else { return false }
      return try composer().addAttachmentURL(url, withAlternateFilename: withAlternateFilename)
    }
  }
  func present(animated: Bool, didFinish: @escaping (MessageComposeResult) -> Void) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        let controller = try self.composer()
        let inner = try self.presentation.present(controller, owner: self, animated: animated)
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
  fileprivate func finish(_ result: MessageComposeResult) {
    let callback = completion
    completion = nil
    callback?(result)
  }
}

final class OneMessageComposeDelegate: NSObject, MFMessageComposeViewControllerDelegate {
  weak var owner: HybridOneMessageCompose?
  func messageComposeViewController(_ controller: MFMessageComposeViewController, didFinishWith result: MessageUI.MessageComposeResult) {
    // bridged and SDK enum names differ only by their module namespace.
    let value: MessageComposeResult
    switch result {
    case .cancelled: value = .cancelled
    case .sent: value = .sent
    case .failed: value = .failed
    @unknown default: value = .failed
    }
    owner?.finish(value)
  }
}
#endif
