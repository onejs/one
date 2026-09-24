import AVFoundation
import ImageIO
import NitroModules
import PhotosUI
import React
import UIKit
import UniformTypeIdentifiers

// imperative image picker: PHPickerViewController for the library, which
// needs no permission, and UIImagePickerController for a camera photo.
// picked assets are copied into the app cache and returned as file uris.
// backing out, a denied permission, and a missing camera all resolve
// canceled; only runtime failures reject. all state is touched on the main
// queue only.
final class HybridOneImagePicker: HybridOneImagePickerSpec {
  private static let failed = "E_IMAGE_PICKER_FAILED"
  private let delegate = HybridOneImagePickerDelegate()
  private var pending: (verb: String, promise: Promise<ImagePickerNativeResult>)?
  // set on launch, read by the picker delegate; one request is in flight at a time.
  private var allowsImages = false
  private var allowsVideos = false

  override init() {
    super.init()
    delegate.owner = self
  }

  // MARK: entry points

  func launchLibrary(options: ResolvedImagePickerOptions) throws -> Promise<ImagePickerNativeResult>
  {
    let promise = Promise<ImagePickerNativeResult>()
    DispatchQueue.main.async {
      guard self.takePending("launchLibrary", promise) else { return }
      let allowsImages = options.mediaTypes.contains(.images)
      let allowsVideos = options.mediaTypes.contains(.videos)
      if !allowsImages && !allowsVideos {
        // unreachable from the js entries, which validate first; settle
        // rather than hang a direct caller.
        self.rejectPending("launchLibrary", "mediaTypes must list at least one media type")
        return
      }
      guard let presenter = Self.topViewController(), presenter.presentedViewController == nil
      else {
        self.rejectPending("launchLibrary", "found no view controller to present from")
        return
      }
      var config = PHPickerConfiguration()
      if allowsImages && allowsVideos {
        config.filter = .any(of: [.images, .videos])
      } else if allowsVideos {
        config.filter = .videos
      } else {
        config.filter = .images
      }
      // zero is unlimited on both sides, so the value passes through.
      config.selectionLimit = Int(options.selectionLimit)
      config.selection = .ordered
      if #available(iOS 17.0, *) {
        // compatible transcodes modern captures (heic) to the widely readable
        // representation, so the provider yields public.jpeg.
        config.preferredAssetRepresentationMode = .compatible
      }
      let picker = PHPickerViewController(configuration: config)
      picker.delegate = self.delegate
      picker.presentationController?.delegate = self.delegate
      picker.modalPresentationStyle = .automatic
      self.allowsImages = allowsImages
      self.allowsVideos = allowsVideos
      presenter.present(picker, animated: true)
    }
    return promise
  }

  func launchCamera() throws -> Promise<ImagePickerNativeResult> {
    let promise = Promise<ImagePickerNativeResult>()
    DispatchQueue.main.async {
      guard self.takePending("launchCamera", promise) else { return }
      // refusing and missing hardware are ordinary outcomes: both resolve
      // canceled, like backing out of the picker.
      if !UIImagePickerController.isSourceTypeAvailable(.camera) {
        self.resolvePendingCanceled()
        return
      }
      // without the key the os kills the app on first camera access, so the
      // missing manifest entry is a rejection naming the fix, not a crash.
      if !Self.cameraDeclared {
        self.rejectPending(
          "launchCamera",
          "camera needs NSCameraUsageDescription: set native.app imagePicker.camera and rerun one prebuild"
        )
        return
      }
      switch AVCaptureDevice.authorizationStatus(for: .video) {
      case .denied, .restricted:
        self.resolvePendingCanceled()
      case .notDetermined:
        AVCaptureDevice.requestAccess(for: .video) { granted in
          DispatchQueue.main.async {
            if granted {
              self.presentCamera()
            } else {
              self.resolvePendingCanceled()
            }
          }
        }
      default:
        self.presentCamera()
      }
    }
    return promise
  }

  func getCameraPermissions() throws -> Promise<CameraPermissionResponse> {
    // a read, never a prompt; outside the pending slot so it answers during a pick.
    return Promise.resolved(withResult: Self.cameraPermissionResponse())
  }

  func requestCameraPermissions() throws -> Promise<CameraPermissionResponse> {
    if !Self.cameraDeclared {
      return Promise.rejected(
        withError: oneNativeError(
          Self.failed,
          "ImagePicker.requestCameraPermissions: camera needs NSCameraUsageDescription: set native.app imagePicker.camera and rerun one prebuild"
        ))
    }
    if AVCaptureDevice.authorizationStatus(for: .video) != .notDetermined {
      return Promise.resolved(withResult: Self.cameraPermissionResponse())
    }
    let promise = Promise<CameraPermissionResponse>()
    AVCaptureDevice.requestAccess(for: .video) { _ in
      DispatchQueue.main.async {
        promise.resolve(withResult: Self.cameraPermissionResponse())
      }
    }
    return promise
  }

  private static var cameraDeclared: Bool {
    return Bundle.main.object(forInfoDictionaryKey: "NSCameraUsageDescription") != nil
  }

  private static func cameraPermissionResponse() -> CameraPermissionResponse {
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized:
      return CameraPermissionResponse(status: .granted, granted: true, canAskAgain: true)
    case .notDetermined:
      return CameraPermissionResponse(status: .undetermined, granted: false, canAskAgain: true)
    default:
      return CameraPermissionResponse(status: .denied, granted: false, canAskAgain: false)
    }
  }

  // MARK: camera

  private func presentCamera() {
    guard let presenter = Self.topViewController(), presenter.presentedViewController == nil
    else {
      rejectPending("launchCamera", "found no view controller to present from")
      return
    }
    let picker = UIImagePickerController()
    picker.sourceType = .camera
    picker.mediaTypes = [UTType.image.identifier]
    picker.delegate = delegate
    picker.presentationController?.delegate = delegate
    presenter.present(picker, animated: true)
  }

  fileprivate func cameraDidFinish(_ picker: UIImagePickerController, image: UIImage?) {
    picker.dismiss(animated: true) {
      guard let image, let cgImage = image.cgImage else {
        self.rejectPending("launchCamera", "the camera returned no image")
        return
      }
      guard let data = image.jpegData(compressionQuality: 0.9) else {
        self.rejectPending("launchCamera", "could not encode the photo")
        return
      }
      guard let destination = Self.cacheURL(prefix: "IMG", extension: "jpg") else {
        self.rejectPending("launchCamera", "could not save the photo")
        return
      }
      do {
        try data.write(to: destination, options: .atomic)
      } catch {
        self.rejectPending("launchCamera", error.localizedDescription)
        return
      }
      var width = Double(cgImage.width)
      var height = Double(cgImage.height)
      // left and right orientations (exif 5 to 8) store the pixels transposed
      // to the display axes, so the reported size swaps to match what renders.
      switch image.imageOrientation {
      case .left, .leftMirrored, .right, .rightMirrored:
        swap(&width, &height)
      default:
        break
      }
      self.resolvePending([
        ImagePickerAsset(
          uri: destination.absoluteString, width: width, height: height, mimeType: "image/jpeg",
          fileName: destination.lastPathComponent, fileSize: Double(data.count))
      ])
    }
  }

  fileprivate func cameraDidCancel(_ picker: UIImagePickerController) {
    picker.dismiss(animated: true) {
      self.resolvePendingCanceled()
    }
  }

  // MARK: library

  fileprivate func libraryDidFinish(_ picker: PHPickerViewController, results: [PHPickerResult]) {
    let allowsImages = self.allowsImages
    let allowsVideos = self.allowsVideos
    // dismiss first: loading file representations can take a while and the
    // picker staying up meanwhile reads as a hang.
    picker.dismiss(animated: true) {
      if results.isEmpty {
        self.resolvePendingCanceled()
        return
      }
      self.load(results, allowsImages: allowsImages, allowsVideos: allowsVideos)
    }
  }

  // one group entry per item; a video item leaves from its track callback.
  // the assets array is indexed, so ordered selection order survives the
  // out-of-order completions. the first failure rejects the whole call.
  private func load(_ results: [PHPickerResult], allowsImages: Bool, allowsVideos: Bool) {
    let lock = NSLock()
    // written from completion queues under the lock, read on notify.
    var assets = [ImagePickerAsset?](repeating: nil, count: results.count)
    var failure: String?
    let fail = { (message: String) in
      lock.lock()
      if failure == nil { failure = message }
      lock.unlock()
    }
    let group = DispatchGroup()
    for (index, result) in results.enumerated() {
      guard
        let chosen = Self.typeIdentifier(
          result.itemProvider, allowsImages: allowsImages, allowsVideos: allowsVideos)
      else {
        fail("picked an item of an unsupported type")
        continue
      }
      group.enter()
      result.itemProvider.loadFileRepresentation(forTypeIdentifier: chosen) { url, error in
        Self.finishItem(url: url, error: error, chosen: chosen, fail: fail) { asset in
          lock.lock()
          assets[index] = asset
          lock.unlock()
          group.leave()
        } failed: {
          group.leave()
        }
      }
    }
    // every item rejected up front leaves the group empty and still notifies.
    group.notify(queue: .main) {
      let loaded = assets.compactMap { $0 }
      if failure != nil || loaded.count != assets.count {
        self.rejectPending("launchLibrary", failure ?? "could not load a picked item")
        return
      }
      self.resolvePending(loaded)
    }
  }

  private static func typeIdentifier(
    _ provider: NSItemProvider, allowsImages: Bool, allowsVideos: Bool
  ) -> String? {
    for identifier in provider.registeredTypeIdentifiers {
      guard let type = UTType(identifier) else { continue }
      if allowsImages && type.conforms(to: .image) { return identifier }
      if allowsVideos && type.conforms(to: .movie) { return identifier }
    }
    return nil
  }

  // the provider deletes its file when this callback returns, so the copy
  // happens here, synchronously.
  private static func finishItem(
    url: URL?, error: Error?, chosen: String, fail: (String) -> Void,
    done: @escaping (ImagePickerAsset) -> Void, failed: () -> Void
  ) {
    guard let url else {
      fail(error?.localizedDescription ?? "could not load a picked item")
      failed()
      return
    }
    let type = UTType(chosen)
    let isVideo = type?.conforms(to: .movie) ?? false
    var ext = type?.preferredFilenameExtension ?? url.pathExtension
    if ext.isEmpty { ext = "dat" }
    let destination = cacheURL(prefix: isVideo ? "VID" : "IMG", extension: ext)
    let scoped = url.startAccessingSecurityScopedResource()
    var copyError: Error?
    if let destination {
      do {
        try FileManager.default.copyItem(at: url, to: destination)
      } catch {
        copyError = error
      }
    }
    if scoped { url.stopAccessingSecurityScopedResource() }
    guard let destination, copyError == nil else {
      fail(copyError?.localizedDescription ?? "could not copy a picked item")
      failed()
      return
    }
    let mimeType = type?.preferredMIMEType
    let fileSize = (try? FileManager.default.attributesOfItem(atPath: destination.path))?[
      .size] as? NSNumber
    let asset = { (width: Double, height: Double) in
      ImagePickerAsset(
        uri: destination.absoluteString, width: width, height: height, mimeType: mimeType,
        fileName: destination.lastPathComponent, fileSize: fileSize?.doubleValue)
    }
    if !isVideo {
      let size = imageSize(destination)
      done(asset(size.width, size.height))
      return
    }
    AVURLAsset(url: destination).loadTracks(withMediaType: .video) { tracks, _ in
      // naturalSize is the encoded size; rotation handling stays out of
      // this small api.
      let size = tracks?.first?.naturalSize ?? .zero
      done(asset(Double(size.width), Double(size.height)))
    }
  }

  // MARK: interactive dismiss

  // swiping a sheet down bypasses both picker delegates, so without this the
  // promise would hang. settling is idempotent: whichever delegate fires
  // first wins and the other is a no-op.
  fileprivate func presentationDidDismiss() {
    resolvePendingCanceled()
  }

  // MARK: files

  private static func cacheURL(prefix: String, extension ext: String) -> URL? {
    let files = FileManager.default
    guard let cache = files.urls(for: .cachesDirectory, in: .userDomainMask).first else {
      return nil
    }
    let directory = cache.appendingPathComponent("one-native-image-picker", isDirectory: true)
    do {
      try files.createDirectory(at: directory, withIntermediateDirectories: true)
    } catch {
      return nil
    }
    return directory.appendingPathComponent("\(prefix)_\(UUID().uuidString).\(ext)")
  }

  private static func imageSize(_ url: URL) -> (width: Double, height: Double) {
    guard let source = CGImageSourceCreateWithURL(url as CFURL, nil),
      let properties = CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any]
    else {
      return (0, 0)
    }
    let width = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.doubleValue ?? 0
    let height = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.doubleValue ?? 0
    // exif orientations 5 to 8 store the pixels transposed to the display
    // axes, so the reported size swaps to match what renders. a missing
    // orientation reads 0 and falls through unswapped.
    let orientation = (properties[kCGImagePropertyOrientation] as? NSNumber)?.intValue ?? 0
    if orientation >= 5 && orientation <= 8 {
      return (height, width)
    }
    return (width, height)
  }

  // MARK: promise plumbing

  // one launch in flight: native owns the slot, so a second launch rejects
  // instead of clobbering the pending promise.
  private func takePending(_ verb: String, _ promise: Promise<ImagePickerNativeResult>) -> Bool {
    if pending != nil {
      promise.reject(
        withError: oneNativeError(
          Self.failed, "ImagePicker.\(verb): another request is already in flight"))
      return false
    }
    pending = (verb, promise)
    return true
  }

  private func resolvePending(_ assets: [ImagePickerAsset]) {
    let promise = pending?.promise
    pending = nil
    promise?.resolve(withResult: ImagePickerNativeResult(canceled: false, assets: assets))
  }

  private func resolvePendingCanceled() {
    let promise = pending?.promise
    pending = nil
    promise?.resolve(withResult: ImagePickerNativeResult(canceled: true, assets: nil))
  }

  private func rejectPending(_ verb: String, _ message: String) {
    let promise = pending?.promise
    pending = nil
    promise?.reject(withError: oneNativeError(Self.failed, "ImagePicker.\(verb): \(message)"))
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
final class HybridOneImagePickerDelegate: NSObject, PHPickerViewControllerDelegate,
  UIImagePickerControllerDelegate, UINavigationControllerDelegate,
  UIAdaptivePresentationControllerDelegate
{
  weak var owner: HybridOneImagePicker?

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    owner?.libraryDidFinish(picker, results: results)
  }

  func imagePickerController(
    _ picker: UIImagePickerController,
    didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
  ) {
    owner?.cameraDidFinish(picker, image: info[.originalImage] as? UIImage)
  }

  func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
    owner?.cameraDidCancel(picker)
  }

  func presentationControllerDidDismiss(_ presentationController: UIPresentationController) {
    owner?.presentationDidDismiss()
  }
}
