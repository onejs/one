import UIKit

// the SDK bindings find a table by name, so javascript reaches this one with
// callSDK('OneNativeViews', id, null, args): 0 registers a view for Swift.UIKitView,
// 1 registers a cell source and 2 reserves a content id for Swift.UIKitContent, 3 reads
// that content's view, and 4 and 5 make cell sources.
@objc(OneSDKTable_OneNativeViews) final class OneSDKTable_OneNativeViews: NSObject, OneSDKTable {
  @MainActor func observe(_ id: Int, _ call: OneSDKCall, _ emit: @escaping (Any) -> Void) throws -> OneSDKSubscription {
    throw OneSDKError.unsupported("observing OneNativeViews #\(id)")
  }

  func argumentNames(_ id: Int) -> [String] {
    switch id {
    case 0, 4, 5: ["view"]
    case 1: ["source"]
    case 3: ["content"]
    default: []
    }
  }

  func sync(_ id: Int, _ call: OneSDKCall) throws -> Any {
    switch id {
    case 0:
      let object: NSObject = try call.arg(0)
      guard object is UIView || object is UIViewController else {
        throw OneSDKError.badArgument(index: 0, expected: "a UIView or UIViewController", got: String(reflecting: type(of: object)))
      }
      return call.out(Double(OneNativeUIKitRegistry.register(object)))
    case 1:
      let object: NSObject = try call.arg(0)
      guard OneNativeCellSource.of(object) != nil else {
        throw OneSDKError.badArgument(index: 0, expected: "a source from One.iOS.collectionCellSource or tableCellSource", got: String(reflecting: type(of: object)))
      }
      return call.out(Double(OneNativeUIKitRegistry.register(object)))
    case 2:
      return call.out(Double(OneNativeContentRegistry.reserve()))
    default:
      throw OneSDKError.unknownSymbol("OneNativeViews #\(id)")
    }
  }

  func async(_ id: Int, _ call: OneSDKCall) async throws -> Any {
    switch id {
    case 3:
      return try await { @MainActor in
        let content: Double = try call.arg(0)
        return call.out(try await OneNativeContentRegistry.mounted(Int(content)))
      }()
    case 4:
      return try await { @MainActor in
        let view: UICollectionView = try call.arg(0)
        return call.out(OneNativeCellSource.collection(view))
      }()
    case 5:
      return try await { @MainActor in
        let view: UITableView = try call.arg(0)
        return call.out(OneNativeCellSource.table(view))
      }()
    default:
      throw OneSDKError.unsupported("OneNativeViews #\(id) asynchronously")
    }
  }
}
