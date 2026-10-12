import Foundation

// test transport only; byte transport in the production class.
public final class ArrayBuffer {
  private let data: Data
  public init(data: Data) { self.data = data }
  public static func copy(data: Data) throws -> ArrayBuffer { ArrayBuffer(data: data) }
  public func toData(copyIfNeeded: Bool) -> Data { data }
}
