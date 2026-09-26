import NitroModules
import Photos

final class HybridOnePhotoLibrary: HybridOnePhotoLibrarySpec {
  private enum MediaKind { case image, video }

  func getAddPermissionStatus() throws -> PhotoLibraryPermissionStatus {
    Self.status(PHPhotoLibrary.authorizationStatus(for: .addOnly))
  }

  func requestAddPermission() throws -> Promise<PhotoLibraryPermissionStatus> {
    let promise = Promise<PhotoLibraryPermissionStatus>()
    DispatchQueue.main.async {
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_MANIFEST",
          "PhotoLibrary.requestAddPermission: set native.app.photoLibrary.addOnly"))
        return
      }
      PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
        promise.resolve(withResult: Self.status(status))
      }
    }
    return promise
  }

  func saveImage(uri: String) throws -> Promise<String> { save(uri, kind: .image) }
  func saveVideo(uri: String) throws -> Promise<String> { save(uri, kind: .video) }

  private func save(_ uri: String, kind: MediaKind) -> Promise<String> {
    let promise = Promise<String>()
    DispatchQueue.main.async {
      let verb = kind == .image ? "saveImage" : "saveVideo"
      guard Self.hasUsageDescription else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_MANIFEST",
          "PhotoLibrary.\(verb): set native.app.photoLibrary.addOnly"))
        return
      }
      guard PHPhotoLibrary.authorizationStatus(for: .addOnly) == .authorized else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_PERMISSION",
          "PhotoLibrary.\(verb): add-only Photos permission is required"))
        return
      }
      guard let url = URL(string: uri), url.isFileURL,
        url.host == nil || url.host == "" || url.host == "localhost",
        url.query == nil, url.fragment == nil
      else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_URI", "PhotoLibrary.\(verb): an existing file:// URI is required"))
        return
      }
      var directory: ObjCBool = false
      guard FileManager.default.fileExists(atPath: url.path, isDirectory: &directory),
        !directory.boolValue
      else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_FILE", "PhotoLibrary.\(verb): file does not exist"))
        return
      }
      var identifier: String?
      PHPhotoLibrary.shared().performChanges {
        let request = kind == .image
          ? PHAssetChangeRequest.creationRequestForAssetFromImage(atFileURL: url)
          : PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: url)
        identifier = request?.placeholderForCreatedAsset?.localIdentifier
      } completionHandler: { success, error in
        if success, let identifier {
          promise.resolve(withResult: identifier)
        } else {
          promise.reject(withError: Self.error(
            "E_PHOTO_LIBRARY_SAVE",
            "PhotoLibrary.\(verb): \(error?.localizedDescription ?? "Photos did not create an asset")"))
        }
      }
    }
    return promise
  }

  private static var hasUsageDescription: Bool {
    guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSPhotoLibraryAddUsageDescription")
      as? String else { return false }
    return !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  private static func status(_ value: PHAuthorizationStatus) -> PhotoLibraryPermissionStatus {
    switch value {
    case .notDetermined: return .notdetermined
    case .restricted: return .restricted
    case .denied: return .denied
    case .authorized: return .authorized
    case .limited: return .limited
    @unknown default: return .restricted
    }
  }

  private static func error(_ code: String, _ message: String) -> RuntimeError {
    oneNativeError(code, message)
  }
}
