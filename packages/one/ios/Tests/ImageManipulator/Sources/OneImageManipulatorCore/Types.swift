// stand-ins for generated nitro value types; no image behavior.
class HybridOneImageManipulatorSpec {}

struct ImageCrop {
  let x: Double
  let y: Double
  let width: Double
  let height: Double
}

struct ImageResize {
  let width: Double?
  let height: Double?
}

enum OneImageFlip {
  case horizontal
  case vertical
}

enum OneImageFormat {
  case jpeg
  case png
  case webp
}

struct ImageTransformOptions {
  let crop: ImageCrop?
  let resize: ImageResize?
  let rotate: Double?
  let flip: OneImageFlip?
  let format: OneImageFormat
  let quality: Double?
}

struct ImageTransformResult {
  let uri: String
  let width: Double
  let height: Double
  let size: Double
}
