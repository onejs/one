import NitroModules
import UIKit
import VisionKit

// controller state and delegate delivery are owned by the main queue.
final class HybridOneDocumentCamera: HybridOneDocumentCameraSpec {
  private var controller: VNDocumentCameraViewController?
  private var presenting = false
  private var dismissing = false
  private let delegate = OneDocumentCameraDelegate()
  private var keepAlive: HybridOneDocumentCamera?
  fileprivate var didFinish: ((any HybridDocumentCameraScanSpec) -> Void)?
  fileprivate var didCancel: (() -> Void)?
  fileprivate var didFail: ((DocumentCameraError) -> Void)?

  override init() {
    super.init()
    delegate.owner = self
  }

  var isSupported: Bool { VNDocumentCameraViewController.isSupported }

  func present(
    animated: Bool,
    didFinish: @escaping (any HybridDocumentCameraScanSpec) -> Void,
    didCancel: @escaping () -> Void,
    didFail: @escaping (DocumentCameraError) -> Void
  ) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        guard self.controller == nil, !self.presenting, !self.dismissing else {
          throw oneNativeError("E_DOCUMENT_CAMERA_PRESENTED", "Document camera is already presented")
        }
        guard VNDocumentCameraViewController.isSupported else {
          throw oneNativeError("E_DOCUMENT_CAMERA_UNSUPPORTED", "Document camera is unavailable on this device")
        }
        guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSCameraUsageDescription") as? String,
          !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
          throw oneNativeError("E_DOCUMENT_CAMERA_MANIFEST", "Set ios.infoPlist.NSCameraUsageDescription")
        }
        guard let presenter = oneNativePresentingViewController(),
          presenter.viewIfLoaded?.window != nil,
          !presenter.isBeingPresented, !presenter.isBeingDismissed else {
          throw oneNativeError("E_DOCUMENT_CAMERA_PRESENTER", "No active view controller can present the document camera")
        }
        let camera = VNDocumentCameraViewController()
        camera.delegate = self.delegate
        self.controller = camera
        self.presenting = true
        self.keepAlive = self
        self.didFinish = didFinish
        self.didCancel = didCancel
        self.didFail = didFail
        presenter.present(camera, animated: animated) {
          self.presenting = false
          camera.presentationController?.delegate = self.delegate
          promise.resolve(withResult: ())
        }
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func dismiss(animated: Bool) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      guard let camera = self.controller else {
        promise.resolve(withResult: ())
        return
      }
      guard !self.presenting, !self.dismissing else {
        promise.reject(withError: oneNativeError("E_DOCUMENT_CAMERA_TRANSITION", "Document camera transition is in progress"))
        return
      }
      self.dismissing = true
      camera.dismiss(animated: animated) {
        self.clear()
        promise.resolve(withResult: ())
      }
    }
    return promise
  }

  fileprivate func clear() {
    controller?.delegate = nil
    controller = nil
    presenting = false
    dismissing = false
    didFinish = nil
    didCancel = nil
    didFail = nil
    keepAlive = nil
  }

  // sdk completion leaves dismissal to the delegate; consume each result once.
  fileprivate func takeCallbacks() {
    didFinish = nil
    didCancel = nil
    didFail = nil
  }
}

final class OneDocumentCameraDelegate: NSObject, VNDocumentCameraViewControllerDelegate,
  UIAdaptivePresentationControllerDelegate {
  weak var owner: HybridOneDocumentCamera?

  func documentCameraViewController(_ controller: VNDocumentCameraViewController,
    didFinishWith scan: VNDocumentCameraScan) {
    let callback = owner?.didFinish
    owner?.takeCallbacks()
    callback?(HybridDocumentCameraScan(scan))
  }

  func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
    let callback = owner?.didCancel
    owner?.takeCallbacks()
    callback?()
  }

  func documentCameraViewController(_ controller: VNDocumentCameraViewController,
    didFailWithError error: Error) {
    let callback = owner?.didFail
    owner?.takeCallbacks()
    let failure = error as NSError
    callback?(DocumentCameraError(domain: failure.domain, code: Double(failure.code),
      localizedDescription: failure.localizedDescription))
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    let callback = owner?.didCancel
    owner?.clear()
    callback?()
  }
}

final class HybridDocumentCameraScan: HybridDocumentCameraScanSpec {
  private let scan: VNDocumentCameraScan
  init(_ scan: VNDocumentCameraScan) { self.scan = scan; super.init() }
  var title: String { scan.title }
  var pageCount: Double { Double(scan.pageCount) }
  func imageOfPage(at: Double) throws -> any HybridDocumentCameraImageSpec {
    guard at.isFinite, at.rounded(.towardZero) == at, at >= 0, at < Double(scan.pageCount) else {
      throw oneNativeError("E_DOCUMENT_CAMERA_PAGE", "Page index must be an integer within pageCount")
    }
    return HybridDocumentCameraImage(scan.imageOfPage(at: Int(at)))
  }
}

final class HybridDocumentCameraImage: HybridDocumentCameraImageSpec {
  private let image: UIImage
  init(_ image: UIImage) { self.image = image; super.init() }
  var size: DocumentCameraImageSize {
    DocumentCameraImageSize(width: Double(image.size.width), height: Double(image.size.height))
  }
  var scale: Double { Double(image.scale) }
  func pngData() throws -> ArrayBuffer? {
    try image.pngData().map { try ArrayBuffer.copy(data: $0) }
  }
  func jpegData(compressionQuality: Double) throws -> ArrayBuffer? {
    guard compressionQuality.isFinite, (0...1).contains(compressionQuality) else {
      throw oneNativeError("E_DOCUMENT_CAMERA_QUALITY", "Compression quality must be within 0...1")
    }
    return try image.jpegData(compressionQuality: compressionQuality).map { try ArrayBuffer.copy(data: $0) }
  }
}
