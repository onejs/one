import NitroModules
import React
import UIKit
import UniformTypeIdentifiers

// imperative document picker: UIDocumentPickerViewController opened as a copy,
// so the system hands over files in the app's own tmp inbox and no provider
// access outlives the pick. each file moves into the app cache under its
// display name and returns as a file uri. backing out resolves canceled; only
// runtime failures reject. all state is touched on the main queue only.
final class HybridOneDocumentPicker: HybridOneDocumentPickerSpec {
  private static let failed = "E_DOCUMENT_PICKER_FAILED"
  private let delegate = HybridOneDocumentPickerDelegate()
  private var pending: Promise<DocumentPickerNativeResult>?

  override init() {
    super.init()
    delegate.owner = self
  }

  func getDocument(options: ResolvedDocumentPickerOptions) throws -> Promise<
    DocumentPickerNativeResult
  > {
    let promise = Promise<DocumentPickerNativeResult>()
    DispatchQueue.main.async {
      // one pick in flight: native owns the slot, so a second pick rejects
      // instead of clobbering the pending promise.
      if self.pending != nil {
        promise.reject(
          withError: oneNativeError(
            Self.failed, "DocumentPicker.getDocument: another request is already in flight"))
        return
      }
      self.pending = promise
      guard let presenter = Self.topViewController(), presenter.presentedViewController == nil
      else {
        self.rejectPending("found no view controller to present from")
        return
      }
      let picker = UIDocumentPickerViewController(
        forOpeningContentTypes: options.types.map(Self.contentType), asCopy: true)
      picker.allowsMultipleSelection = options.multiple
      picker.delegate = self.delegate
      picker.presentationController?.delegate = self.delegate
      presenter.present(picker, animated: true)
    }
    return promise
  }

  // exact mime types map through their registered type; a wildcard maps to
  // the parent type its family conforms to. an unknown exact type becomes a
  // dynamic type that matches nothing, the same as an unmatched filter.
  private static func contentType(_ mimeType: String) -> UTType {
    switch mimeType {
    case "*/*": return .item
    case "image/*": return .image
    case "video/*": return .movie
    case "audio/*": return .audio
    case "text/*": return .text
    case "font/*": return .font
    default:
      if mimeType.hasSuffix("/*") { return .data }
      return UTType(mimeType: mimeType) ?? .data
    }
  }

  fileprivate func didPick(_ urls: [URL]) {
    if urls.isEmpty {
      resolvePending(nil)
      return
    }
    var assets: [DocumentPickerAsset] = []
    for url in urls {
      let scoped = url.startAccessingSecurityScopedResource()
      defer { if scoped { url.stopAccessingSecurityScopedResource() } }
      do {
        assets.append(try Self.cache(url))
      } catch {
        rejectPending(error.localizedDescription)
        return
      }
    }
    resolvePending(assets)
  }

  // swiping the sheet down may bypass the picker delegate, so without this
  // the promise would hang. settling is idempotent: whichever delegate fires
  // first wins and the other is a no-op.
  fileprivate func didCancel() {
    resolvePending(nil)
  }

  // MARK: files

  // each pick gets its own directory so the display name survives as the file
  // name without colliding with an earlier pick of the same name.
  private static func cache(_ url: URL) throws -> DocumentPickerAsset {
    let files = FileManager.default
    let directory = files.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("one-native-document-picker", isDirectory: true)
      .appendingPathComponent(UUID().uuidString, isDirectory: true)
    try files.createDirectory(at: directory, withIntermediateDirectories: true)
    let destination = directory.appendingPathComponent(url.lastPathComponent)
    // the copy already lives in the app's tmp inbox, so a move is a rename.
    try files.moveItem(at: url, to: destination)
    let values = try destination.resourceValues(forKeys: [.contentTypeKey, .fileSizeKey])
    return DocumentPickerAsset(
      uri: destination.absoluteString, name: destination.lastPathComponent,
      mimeType: values.contentType?.preferredMIMEType, size: values.fileSize.map(Double.init))
  }

  // MARK: promise plumbing

  private func resolvePending(_ assets: [DocumentPickerAsset]?) {
    let promise = pending
    pending = nil
    promise?.resolve(
      withResult: DocumentPickerNativeResult(canceled: assets == nil, assets: assets))
  }

  private func rejectPending(_ message: String) {
    let promise = pending
    pending = nil
    promise?.reject(
      withError: oneNativeError(Self.failed, "DocumentPicker.getDocument: \(message)"))
  }

  private static func topViewController() -> UIViewController? {
    var top = RCTKeyWindow()?.rootViewController
    while let presented = top?.presentedViewController {
      top = presented
    }
    return top
  }
}

// the picker and presentation delegate protocols need an NSObject, which a
// hybrid object cannot subclass.
final class HybridOneDocumentPickerDelegate: NSObject, UIDocumentPickerDelegate,
  UIAdaptivePresentationControllerDelegate
{
  weak var owner: HybridOneDocumentPicker?

  func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL])
  {
    owner?.didPick(urls)
  }

  func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
    owner?.didCancel()
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    owner?.didCancel()
  }
}
