import UIKit

// stand-in for the SDWebImageWebPCoder pod, which the harness never links.
// member names mirror the vendored 0.15.0 headers (SDImageWebPCoder.h,
// SDImageCoder.h, NSData+ImageContentType.h); only call-site shapes are stubbed.
public struct SDImageFormat: Hashable {
  public static let webP = SDImageFormat()
}

public struct SDImageCoderOption: Hashable {
  public static let encodeCompressionQuality = SDImageCoderOption()
}

public final class SDImageWebPCoder {
  public static let shared = SDImageWebPCoder()
  public func encodedData(
    with image: UIImage?,
    format: SDImageFormat,
    options: [SDImageCoderOption: Any]?
  ) -> Data? {
    nil
  }
}
