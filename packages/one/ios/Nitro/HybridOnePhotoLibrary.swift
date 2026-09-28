import NitroModules
import Photos
import UniformTypeIdentifiers

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

  func getReadPermissionStatus() throws -> PhotoLibraryPermissionStatus {
    Self.status(PHPhotoLibrary.authorizationStatus(for: .readWrite))
  }

  func requestReadPermission() throws -> Promise<PhotoLibraryPermissionStatus> {
    let promise = Promise<PhotoLibraryPermissionStatus>()
    DispatchQueue.main.async {
      guard Self.hasReadUsageDescription else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_MANIFEST",
          "PhotoLibrary.requestReadPermission: set native.app.photoLibrary.readWrite"))
        return
      }
      PHPhotoLibrary.requestAuthorization(for: .readWrite) { status in
        promise.resolve(withResult: Self.status(status))
      }
    }
    return promise
  }

  func listAssets(offset: Double, limit: Double) throws -> Promise<PhotoLibraryAssetPage> {
    let promise = Promise<PhotoLibraryAssetPage>()
    DispatchQueue.global(qos: .userInitiated).async {
      guard Self.hasReadUsageDescription else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_MANIFEST",
          "PhotoLibrary.listAssets: set native.app.photoLibrary.readWrite"))
        return
      }
      guard Self.canRead else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_PERMISSION",
          "PhotoLibrary.listAssets: Photos read permission is required"))
        return
      }
      guard offset.isFinite, offset >= 0, offset.rounded() == offset,
        offset <= 1_000_000, limit.isFinite, limit > 0,
        limit <= 100, limit.rounded() == limit
      else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_INPUT",
          "PhotoLibrary.listAssets: offset must be 0..1000000 and limit must be 1..100 integers"))
        return
      }

      let options = PHFetchOptions()
      options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
      let result = PHAsset.fetchAssets(with: options)
      let start = min(Int(offset), result.count)
      let end = min(start + Int(limit), result.count)
      var assets: [PhotoLibraryAsset] = []
      assets.reserveCapacity(end - start)
      for index in start..<end {
        assets.append(Self.asset(result.object(at: index)))
      }
      promise.resolve(withResult: PhotoLibraryAssetPage(
        assets: assets, totalCount: Double(result.count)))
    }
    return promise
  }

  func getAsset(identifier: String) throws -> Promise<PhotoLibraryAsset> {
    let promise = Promise<PhotoLibraryAsset>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        promise.resolve(withResult: Self.asset(try Self.readableAsset(identifier, "getAsset")))
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func setFavorite(identifier: String, favorite: Bool) throws -> Promise<Void> {
    changeAsset(identifier, operation: "setFavorite", failureCode: "E_PHOTO_LIBRARY_CHANGE") {
      PHAssetChangeRequest(for: $0).isFavorite = favorite
    }
  }

  func deleteAsset(identifier: String) throws -> Promise<Void> {
    changeAsset(identifier, operation: "deleteAsset", failureCode: "E_PHOTO_LIBRARY_DELETE") {
      PHAssetChangeRequest.deleteAssets([$0] as NSArray)
    }
  }

  private func changeAsset(
    _ identifier: String,
    operation: String,
    failureCode: String,
    change: @escaping (PHAsset) -> Void
  ) -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        let asset = try Self.readableAsset(identifier, operation)
        PHPhotoLibrary.shared().performChanges {
          change(asset)
        } completionHandler: { success, error in
          if success {
            promise.resolve()
          } else {
            promise.reject(withError: Self.error(failureCode,
              "PhotoLibrary.\(operation): \(error?.localizedDescription ?? "Photos rejected the change")"))
          }
        }
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func exportOriginalAsset(identifier: String, allowNetwork: Bool) throws -> Promise<String> {
    let promise = Promise<String>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let asset = try Self.readableAsset(identifier, "exportOriginalAsset")
        let resourceType: PHAssetResourceType
        switch asset.mediaType {
        case .image: resourceType = .photo
        case .video: resourceType = .video
        case .audio: resourceType = .audio
        case .unknown:
          throw Self.error("E_PHOTO_LIBRARY_RESOURCE",
            "PhotoLibrary.exportOriginalAsset: unsupported asset media type")
        @unknown default:
          throw Self.error("E_PHOTO_LIBRARY_RESOURCE",
            "PhotoLibrary.exportOriginalAsset: unsupported asset media type")
        }
        guard let resource = PHAssetResource.assetResources(for: asset).first(where: {
          $0.type == resourceType
        }), let ext = UTType(resource.uniformTypeIdentifier)?.preferredFilenameExtension else {
          throw Self.error("E_PHOTO_LIBRARY_RESOURCE",
            "PhotoLibrary.exportOriginalAsset: original asset resource is unavailable")
        }
        let url = FileManager.default.temporaryDirectory
          .appendingPathComponent("one-photo-\(UUID().uuidString)")
          .appendingPathExtension(ext)
        let options = PHAssetResourceRequestOptions()
        options.isNetworkAccessAllowed = allowNetwork
        PHAssetResourceManager.default().writeData(for: resource, toFile: url, options: options) { error in
          if let error {
            try? FileManager.default.removeItem(at: url)
            promise.reject(withError: Self.error("E_PHOTO_LIBRARY_EXPORT",
              "PhotoLibrary.exportOriginalAsset: \(error.localizedDescription)"))
          } else {
            promise.resolve(withResult: url.absoluteString)
          }
        }
      } catch {
        promise.reject(withError: error)
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
      guard Self.hasUsageDescription || Self.hasReadUsageDescription else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_MANIFEST",
          "PhotoLibrary.\(verb): set native.app.photoLibrary.addOnly or readWrite"))
        return
      }
      let canAdd = Self.hasUsageDescription &&
        PHPhotoLibrary.authorizationStatus(for: .addOnly) == .authorized
      guard canAdd || (Self.hasReadUsageDescription && Self.canRead) else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_PERMISSION",
          "PhotoLibrary.\(verb): Photos add-only or read/write permission is required"))
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

  private static var hasReadUsageDescription: Bool {
    guard let usage = Bundle.main.object(forInfoDictionaryKey: "NSPhotoLibraryUsageDescription")
      as? String else { return false }
    return !usage.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
  }

  private static var canRead: Bool {
    let status = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    return status == .authorized || status == .limited
  }

  private static func readableAsset(_ identifier: String, _ operation: String) throws -> PHAsset {
    guard hasReadUsageDescription else {
      throw error("E_PHOTO_LIBRARY_MANIFEST",
        "PhotoLibrary.\(operation): set native.app.photoLibrary.readWrite")
    }
    guard canRead else {
      throw error("E_PHOTO_LIBRARY_PERMISSION",
        "PhotoLibrary.\(operation): Photos read permission is required")
    }
    guard !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw error("E_PHOTO_LIBRARY_INPUT", "PhotoLibrary.\(operation): identifier is required")
    }
    guard let asset = PHAsset.fetchAssets(withLocalIdentifiers: [identifier], options: nil)
      .firstObject else {
      throw error("E_PHOTO_LIBRARY_NOT_FOUND", "PhotoLibrary.\(operation): asset was not found")
    }
    return asset
  }

  private static func asset(_ value: PHAsset) -> PhotoLibraryAsset {
    let mediaType: PhotoLibraryMediaType
    switch value.mediaType {
    case .unknown: mediaType = .unknown
    case .image: mediaType = .image
    case .video: mediaType = .video
    case .audio: mediaType = .audio
    @unknown default: mediaType = .unknown
    }
    return PhotoLibraryAsset(
      identifier: value.localIdentifier,
      mediaType: mediaType,
      width: Double(value.pixelWidth),
      height: Double(value.pixelHeight),
      durationMs: value.duration * 1000,
      creationDateMs: value.creationDate.map { $0.timeIntervalSince1970 * 1000 },
      isFavorite: value.isFavorite)
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
