import UIKit

// the SDK bindings find a table by name, so javascript reaches this one with
// callSDK('OneNativeViews', 0, null, [handle]).
@objc(OneSDKTable_OneNativeViews) final class OneSDKTable_OneNativeViews: NSObject, OneSDKTable {
  @MainActor func observe(_ id: Int, _ call: OneSDKCall, _ kind: String, _ emit: @escaping (Any) -> Void) throws -> OneSDKSubscription {
    throw OneSDKError.unsupported("observing OneNativeViews #\(id)")
  }

  func argumentNames(_ id: Int) -> [String] { ["view"] }

  func sync(_ id: Int, _ call: OneSDKCall) throws -> Any {
    guard id == 0 else { throw OneSDKError.unknownSymbol("OneNativeViews #\(id)") }
    let object: NSObject = try call.arg(0)
    guard object is UIView || object is UIViewController else {
      throw OneSDKError.badArgument(index: 0, expected: "a UIView or UIViewController", got: String(reflecting: type(of: object)))
    }
    return call.out(Double(OneNativeUIKitRegistry.register(object)))
  }

  func async(_ id: Int, _ call: OneSDKCall) async throws -> Any {
    throw OneSDKError.unsupported("OneNativeViews #\(id) asynchronously")
  }
}
