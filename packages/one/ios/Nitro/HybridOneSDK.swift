import Foundation
import NitroModules

// the native surface of the generated sdk bindings: decodes a call, runs the
// framework's generated table and returns the encoded result with any handles
final class HybridOneSDKHandle: HybridOneSDKHandleSpec {
  let box: OneSDKHandleBox
  init(_ box: OneSDKHandleBox) {
    self.box = box
    super.init()
  }
  var typeName: String { box.typeName }
}

final class HybridOneSDK: HybridOneSDKSpec {
  typealias Dispatch = (_ index: Double, _ json: String, _ handles: [(any HybridOneSDKHandleSpec)]) -> Void

  private static func prepare(
    _ json: String, _ handles: [(any HybridOneSDKHandleSpec)], _ dispatch: @escaping Dispatch
  ) throws -> OneSDKCall {
    let boxes = try handles.map { handle -> OneSDKHandleBox in
      guard let handle = handle as? HybridOneSDKHandle else {
        throw oneNativeError("E_SDK", "expected a handle from the sdk bindings")
      }
      return handle.box
    }
    return try OneSDKCall(json: json, handles: boxes) { index, json, handles in
      dispatch(Double(index), json, handles.map { HybridOneSDKHandle($0) })
    }
  }

  private static func result(_ value: Any, _ call: OneSDKCall) -> OneSDKResult {
    OneSDKResult(json: call.encode(value), handles: call.handlesOut.map { HybridOneSDKHandle($0) })
  }

  private static func failure(_ module: String, _ id: Double, _ error: Error) -> Error {
    oneNativeError("E_SDK", "\(module) #\(Int(id)): \(error.localizedDescription)")
  }

  func call(
    module: String, id: Double, json: String, handles: [(any HybridOneSDKHandleSpec)], dispatch: @escaping Dispatch
  ) throws -> OneSDKResult {
    do {
      let call = try Self.prepare(json, handles, dispatch)
      return Self.result(try OneSDKTables.table(module).sync(Int(id), call), call)
    } catch {
      throw Self.failure(module, id, error)
    }
  }

  func callAsync(
    module: String, id: Double, json: String, handles: [(any HybridOneSDKHandleSpec)], dispatch: @escaping Dispatch
  ) throws -> Promise<OneSDKResult> {
    let call: OneSDKCall
    do {
      call = try Self.prepare(json, handles, dispatch)
    } catch {
      throw Self.failure(module, id, error)
    }
    return Promise.async {
      do {
        return Self.result(try await OneSDKTables.table(module).async(Int(id), call), call)
      } catch {
        throw Self.failure(module, id, error)
      }
    }
  }
}
