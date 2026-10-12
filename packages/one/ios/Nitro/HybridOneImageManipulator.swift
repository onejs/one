import CoreImage
import Foundation
import NitroModules
import UIKit

final class HybridOneImageManipulator: HybridOneImageManipulatorSpec {
  private let queue = DispatchQueue(label: "one.image-manipulator", qos: .userInitiated)
  private static let context = CIContext()

  private enum Problem: Error {
    case uri
    case file
    case decode
    case input(String)
    case encode
  }

  func transform(uri: String, options: ImageTransformOptions) throws -> Promise<ImageTransformResult> {
    let promise = Promise<ImageTransformResult>()
    queue.async {
      do {
        promise.resolve(withResult: try Self.render(uri, options))
      } catch {
        promise.reject(withError: Self.failure(error))
      }
    }
    return promise
  }

  private static func render(_ uri: String, _ options: ImageTransformOptions) throws -> ImageTransformResult {
    guard let url = URL(string: uri), url.isFileURL, url.path.hasPrefix("/"),
      url.host == nil || url.host == "" || url.host == "localhost",
      url.query == nil, url.fragment == nil
    else { throw Problem.uri }
    var directory: ObjCBool = false
    guard FileManager.default.fileExists(atPath: url.path, isDirectory: &directory),
      !directory.boolValue
    else { throw Problem.file }
    guard var image = CIImage(contentsOf: url, options: [.applyOrientationProperty: true]),
      !image.extent.isEmpty, image.extent.width.isFinite, image.extent.height.isFinite
    else { throw Problem.decode }
    image = normalized(image)
    var width = try pixelSize(image.extent.width, "source width")
    var height = try pixelSize(image.extent.height, "source height")

    if let crop = options.crop {
      let x = try pixelSize(crop.x, "crop.x", allowZero: true)
      let y = try pixelSize(crop.y, "crop.y", allowZero: true)
      let cropWidth = try pixelSize(crop.width, "crop.width")
      let cropHeight = try pixelSize(crop.height, "crop.height")
      guard x <= width, y <= height, cropWidth <= width - x, cropHeight <= height - y
      else { throw Problem.input("crop must fit inside the source image") }
      image = normalized(image.cropped(to: CGRect(
        x: CGFloat(x), y: CGFloat(height - y - cropHeight),
        width: CGFloat(cropWidth), height: CGFloat(cropHeight))))
      width = cropWidth
      height = cropHeight
    }

    if let resize = options.resize {
      guard resize.width != nil || resize.height != nil else {
        throw Problem.input("resize needs a width or height")
      }
      let requestedWidth = try resize.width.map { try pixelSize($0, "resize.width") }
      let requestedHeight = try resize.height.map { try pixelSize($0, "resize.height") }
      let targetWidth = requestedWidth
        ?? max(1, Int((Double(width) * Double(requestedHeight!) / Double(height)).rounded()))
      let targetHeight = requestedHeight
        ?? max(1, Int((Double(height) * Double(targetWidth) / Double(width)).rounded()))
      try checkOutputSize(targetWidth, targetHeight)
      image = normalized(image.transformed(by: CGAffineTransform(
        scaleX: CGFloat(targetWidth) / CGFloat(width),
        y: CGFloat(targetHeight) / CGFloat(height))))
      width = targetWidth
      height = targetHeight
    }

    if let rotate = options.rotate {
      guard rotate.isFinite, (0...270).contains(rotate), rotate.rounded() == rotate else {
        throw Problem.input("rotate must be 0, 90, 180, or 270 degrees")
      }
      switch Int(rotate) {
      case 0: break
      case 90:
        image = image.transformed(by: CGAffineTransform(a: 0, b: -1, c: 1, d: 0, tx: 0, ty: CGFloat(width)))
        swap(&width, &height)
      case 180:
        image = image.transformed(by: CGAffineTransform(a: -1, b: 0, c: 0, d: -1, tx: CGFloat(width), ty: CGFloat(height)))
      case 270:
        image = image.transformed(by: CGAffineTransform(a: 0, b: 1, c: -1, d: 0, tx: CGFloat(height), ty: 0))
        swap(&width, &height)
      default: throw Problem.input("rotate must be 0, 90, 180, or 270 degrees")
      }
    }
    let jpegQuality: Double
    switch options.format {
    case .jpeg:
      jpegQuality = options.quality ?? 0.9
      guard jpegQuality.isFinite, (0...1).contains(jpegQuality) else {
        throw Problem.input("JPEG quality must be between 0 and 1")
      }
    case .png:
      guard options.quality == nil else {
        throw Problem.input("quality applies only to JPEG")
      }
      jpegQuality = 0
    }
    try checkOutputSize(width, height)
    guard let cgImage = context.createCGImage(image, from: CGRect(
      x: 0, y: 0, width: CGFloat(width), height: CGFloat(height)))
    else { throw Problem.encode }
    let output = UIImage(cgImage: cgImage)
    let data: Data?
    let ext: String
    switch options.format {
    case .jpeg:
      data = output.jpegData(compressionQuality: CGFloat(jpegQuality))
      ext = "jpg"
    case .png:
      data = output.pngData()
      ext = "png"
    }
    guard let data else { throw Problem.encode }
    let folder = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
      .appendingPathComponent("OneImageManipulator", isDirectory: true)
    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
    let destination = folder.appendingPathComponent(UUID().uuidString).appendingPathExtension(ext)
    try data.write(to: destination, options: .atomic)
    return ImageTransformResult(
      uri: destination.absoluteString, width: Double(width), height: Double(height), size: Double(data.count))
  }

  private static func normalized(_ image: CIImage) -> CIImage {
    image.transformed(by: CGAffineTransform(
      translationX: -image.extent.minX, y: -image.extent.minY))
  }

  private static func pixelSize(_ value: Double, _ name: String, allowZero: Bool = false) throws -> Int {
    guard value.isFinite, value >= (allowZero ? 0 : 1), value <= 100_000,
      value.rounded() == value
    else { throw Problem.input("\(name) must be a whole pixel count") }
    return Int(value)
  }

  private static func pixelSize(_ value: CGFloat, _ name: String) throws -> Int {
    guard value.isFinite, value > 0, value <= 100_000 else {
      throw Problem.input("\(name) is invalid")
    }
    return Int(value.rounded())
  }

  private static func checkOutputSize(_ width: Int, _ height: Int) throws {
    guard width > 0, height > 0, width <= 10_000, height <= 10_000,
      width * height <= 25_000_000
    else { throw Problem.input("output is limited to 25 megapixels and 10,000 pixels per side") }
  }

  private static func failure(_ error: Error) -> RuntimeError {
    if let problem = error as? Problem {
      switch problem {
      case .uri: return oneNativeError("E_IMAGE_URI", "ImageManipulator.transform: an absolute file:// URI is required")
      case .file: return oneNativeError("E_IMAGE_FILE", "ImageManipulator.transform: file does not exist")
      case .decode: return oneNativeError("E_IMAGE_DECODE", "ImageManipulator.transform: source is not a supported image")
      case .input(let message): return oneNativeError("E_IMAGE_INPUT", "ImageManipulator.transform: \(message)")
      case .encode: return oneNativeError("E_IMAGE_ENCODE", "ImageManipulator.transform: encoding failed")
      }
    }
    return oneNativeError("E_IMAGE_FAILED", "ImageManipulator.transform: \(error.localizedDescription)")
  }
}
