import NitroModules
import Photos
import UIKit
import UniformTypeIdentifiers

final class HybridOnePhotoLibrary: HybridOnePhotoLibrarySpec {
  private enum MediaKind { case image, video }
  private var pendingLimitedPicker: Promise<[String]>?

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

  func presentLimitedLibraryPicker() throws -> Promise<[String]> {
    let promise = Promise<[String]>()
    DispatchQueue.main.async {
      guard Self.hasReadUsageDescription else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_MANIFEST",
          "PhotoLibrary.presentLimitedLibraryPicker: set native.app.photoLibrary.readWrite"))
        return
      }
      guard PHPhotoLibrary.authorizationStatus(for: .readWrite) == .limited else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_PERMISSION",
          "PhotoLibrary.presentLimitedLibraryPicker: limited Photos access is required"))
        return
      }
      guard self.pendingLimitedPicker == nil else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_BUSY",
          "PhotoLibrary.presentLimitedLibraryPicker: a picker is already open"))
        return
      }
      guard let presenter = oneNativePresentingViewController() else {
        promise.reject(withError: Self.error(
          "E_PHOTO_LIBRARY_UNAVAILABLE",
          "PhotoLibrary.presentLimitedLibraryPicker: no active view controller"))
        return
      }
      self.pendingLimitedPicker = promise
      PHPhotoLibrary.shared().presentLimitedLibraryPicker(from: presenter) { [weak self] identifiers in
        DispatchQueue.main.async {
          let pending = self?.pendingLimitedPicker
          self?.pendingLimitedPicker = nil
          pending?.resolve(withResult: identifiers)
        }
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
      do {
        let page = try Self.validPage(offset, limit, "listAssets")
        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        promise.resolve(withResult: Self.assetPage(PHAsset.fetchAssets(with: options), page))
      } catch {
        promise.reject(withError: error)
      }
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

  func listAlbums(offset: Double, limit: Double) throws -> Promise<PhotoLibraryAlbumPage> {
    let promise = Promise<PhotoLibraryAlbumPage>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        try Self.requireAlbumAccess("listAlbums")
        let page = try Self.validPage(offset, limit, "listAlbums")
        let result = PHAssetCollection.fetchAssetCollections(
          with: .album, subtype: .albumRegular, options: nil)
        var collections: [PHAssetCollection] = []
        collections.reserveCapacity(result.count)
        result.enumerateObjects { collection, _, _ in collections.append(collection) }
        collections.sort {
          let order = ($0.localizedTitle ?? "").localizedCaseInsensitiveCompare($1.localizedTitle ?? "")
          return order == .orderedSame ? $0.localIdentifier < $1.localIdentifier : order == .orderedAscending
        }
        let start = min(page.offset, collections.count)
        let end = min(start + page.limit, collections.count)
        promise.resolve(withResult: PhotoLibraryAlbumPage(
          albums: collections[start..<end].map(Self.album),
          totalCount: Double(collections.count)))
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func getAlbum(identifier: String) throws -> Promise<PhotoLibraryAlbum> {
    let promise = Promise<PhotoLibraryAlbum>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        promise.resolve(withResult: Self.album(try Self.readableAlbum(identifier, "getAlbum")))
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func createAlbum(title: String) throws -> Promise<String> {
    let promise = Promise<String>()
    DispatchQueue.main.async {
      do {
        try Self.requireAlbumAccess("createAlbum")
        let cleanTitle = try Self.validAlbumTitle(title, "createAlbum")
        var identifier: String?
        PHPhotoLibrary.shared().performChanges {
          identifier = PHAssetCollectionChangeRequest
            .creationRequestForAssetCollection(withTitle: cleanTitle)
            .placeholderForCreatedAssetCollection.localIdentifier
        } completionHandler: { success, error in
          if success, let identifier {
            promise.resolve(withResult: identifier)
          } else {
            promise.reject(withError: Self.error("E_PHOTO_LIBRARY_ALBUM_CHANGE",
              "PhotoLibrary.createAlbum: \(error?.localizedDescription ?? "Photos did not create an album")"))
          }
        }
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func renameAlbum(identifier: String, title: String) throws -> Promise<Void> {
    changeAlbum(identifier, operation: "renameAlbum", edit: .rename) {
      let cleanTitle = try Self.validAlbumTitle(title, "renameAlbum")
      return { $0.title = cleanTitle }
    }
  }

  func listAlbumAssets(identifier: String, offset: Double, limit: Double) throws -> Promise<PhotoLibraryAssetPage> {
    let promise = Promise<PhotoLibraryAssetPage>()
    DispatchQueue.global(qos: .userInitiated).async {
      do {
        let album = try Self.readableAlbum(identifier, "listAlbumAssets")
        let page = try Self.validPage(offset, limit, "listAlbumAssets")
        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        promise.resolve(withResult: Self.assetPage(
          PHAsset.fetchAssets(in: album, options: options), page))
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  func addAssetToAlbum(albumIdentifier: String, assetIdentifier: String) throws -> Promise<Void> {
    changeAlbum(albumIdentifier, operation: "addAssetToAlbum", edit: .addContent) {
      let asset = try Self.readableAsset(assetIdentifier, "addAssetToAlbum")
      return { $0.addAssets([asset] as NSArray) }
    }
  }

  func removeAssetFromAlbum(albumIdentifier: String, assetIdentifier: String) throws -> Promise<Void> {
    changeAlbum(albumIdentifier, operation: "removeAssetFromAlbum", edit: .removeContent) {
      let asset = try Self.readableAsset(assetIdentifier, "removeAssetFromAlbum")
      return { $0.removeAssets([asset] as NSArray) }
    }
  }

  func deleteAlbum(identifier: String) throws -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        let album = try Self.readableAlbum(identifier, "deleteAlbum")
        guard album.canPerform(.delete) else {
          throw Self.error("E_PHOTO_LIBRARY_ALBUM_READONLY", "PhotoLibrary.deleteAlbum: album cannot be deleted")
        }
        PHPhotoLibrary.shared().performChanges {
          PHAssetCollectionChangeRequest.deleteAssetCollections([album] as NSArray)
        } completionHandler: { success, error in
          if success {
            promise.resolve()
          } else {
            promise.reject(withError: Self.error("E_PHOTO_LIBRARY_ALBUM_CHANGE",
              "PhotoLibrary.deleteAlbum: \(error?.localizedDescription ?? "Photos rejected the change")"))
          }
        }
      } catch {
        promise.reject(withError: error)
      }
    }
    return promise
  }

  private func changeAlbum(
    _ identifier: String,
    operation: String,
    edit: PHCollectionEditOperation,
    prepare: @escaping () throws -> (PHAssetCollectionChangeRequest) -> Void
  ) -> Promise<Void> {
    let promise = Promise<Void>()
    DispatchQueue.main.async {
      do {
        let album = try Self.readableAlbum(identifier, operation)
        guard album.canPerform(edit) else {
          throw Self.error("E_PHOTO_LIBRARY_ALBUM_READONLY", "PhotoLibrary.\(operation): album cannot be edited")
        }
        let change = try prepare()
        var requestCreated = false
        PHPhotoLibrary.shared().performChanges {
          if let request = PHAssetCollectionChangeRequest(for: album) {
            requestCreated = true
            change(request)
          }
        } completionHandler: { success, error in
          if success && requestCreated {
            promise.resolve()
          } else {
            promise.reject(withError: Self.error("E_PHOTO_LIBRARY_ALBUM_CHANGE",
              "PhotoLibrary.\(operation): \(error?.localizedDescription ?? "Photos rejected the change")"))
          }
        }
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

  private static func requireAlbumAccess(_ operation: String) throws {
    guard hasReadUsageDescription else {
      throw error("E_PHOTO_LIBRARY_MANIFEST",
        "PhotoLibrary.\(operation): set native.app.photoLibrary.readWrite")
    }
    guard PHPhotoLibrary.authorizationStatus(for: .readWrite) == .authorized else {
      throw error("E_PHOTO_LIBRARY_PERMISSION",
        "PhotoLibrary.\(operation): full Photos read/write permission is required")
    }
  }

  private static func validPage(_ offset: Double, _ limit: Double, _ operation: String) throws -> (offset: Int, limit: Int) {
    guard offset.isFinite, offset >= 0, offset.rounded() == offset,
      offset <= 1_000_000, limit.isFinite, limit > 0,
      limit <= 100, limit.rounded() == limit else {
      throw error("E_PHOTO_LIBRARY_INPUT",
        "PhotoLibrary.\(operation): offset must be 0..1000000 and limit must be 1..100 integers")
    }
    return (Int(offset), Int(limit))
  }

  private static func assetPage(_ result: PHFetchResult<PHAsset>, _ page: (offset: Int, limit: Int)) -> PhotoLibraryAssetPage {
    let start = min(page.offset, result.count)
    let end = min(start + page.limit, result.count)
    var assets: [PhotoLibraryAsset] = []
    assets.reserveCapacity(end - start)
    for index in start..<end { assets.append(asset(result.object(at: index))) }
    return PhotoLibraryAssetPage(assets: assets, totalCount: Double(result.count))
  }

  private static func validAlbumTitle(_ title: String, _ operation: String) throws -> String {
    let trimmed = title.trimmingCharacters(in: .whitespacesAndNewlines)
    guard !trimmed.isEmpty, trimmed.count <= 255 else {
      throw error("E_PHOTO_LIBRARY_INPUT", "PhotoLibrary.\(operation): title must be 1..255 characters")
    }
    return trimmed
  }

  private static func readableAlbum(_ identifier: String, _ operation: String) throws -> PHAssetCollection {
    try requireAlbumAccess(operation)
    guard !identifier.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
      throw error("E_PHOTO_LIBRARY_INPUT", "PhotoLibrary.\(operation): identifier is required")
    }
    guard let album = PHAssetCollection.fetchAssetCollections(
      withLocalIdentifiers: [identifier], options: nil).firstObject,
      album.assetCollectionType == .album, album.assetCollectionSubtype == .albumRegular else {
      throw error("E_PHOTO_LIBRARY_NOT_FOUND", "PhotoLibrary.\(operation): album was not found")
    }
    return album
  }

  private static func album(_ value: PHAssetCollection) -> PhotoLibraryAlbum {
    PhotoLibraryAlbum(identifier: value.localIdentifier, title: value.localizedTitle ?? "")
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
