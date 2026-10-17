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

  typealias SyncDispatch = (_ index: Double, _ json: String, _ handles: [(any HybridOneSDKHandleSpec)]) -> OneSDKResult

  private static func boxes(_ handles: [(any HybridOneSDKHandleSpec)]) throws -> [OneSDKHandleBox] {
    try handles.map { handle in
      guard let handle = handle as? HybridOneSDKHandle else { throw oneNativeError("E_SDK", "expected a handle from the sdk bindings") }
      return handle.box
    }
  }

  private static func prepare(
    _ json: String, _ handles: [(any HybridOneSDKHandleSpec)], _ dispatch: @escaping Dispatch, _ syncDispatch: SyncDispatch? = nil
  ) throws -> OneSDKCall {
    let sync: OneSDKSyncDispatch? = syncDispatch.map { invoke in
      { index, json, handles in
        let reply = invoke(Double(index), json, handles.map { HybridOneSDKHandle($0) })
        do { return OneSDKCallbackReply(json: reply.json, handles: try Self.boxes(reply.handles)) }
        catch { return OneSDKCallbackReply(json: #"{"error":"invalid callback handles","args":[]}"#, handles: []) }
      }
    }
    return try OneSDKCall(json: json, handles: boxes(handles), syncDispatch: sync) { index, json, handles in
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

  func callSync(
    module: String, id: Double, json: String, handles: [(any HybridOneSDKHandleSpec)],
    dispatch: @escaping Dispatch, syncDispatch: @escaping SyncDispatch
  ) throws -> OneSDKResult {
    do {
      let call = try Self.prepare(json, handles, dispatch, syncDispatch)
      defer { call.endSynchronousCallbacks() }
      return Self.result(try OneSDKTables.table(module).sync(Int(id), call), call)
    } catch { throw Self.failure(module, id, error) }
  }

  func callFunction(
    handle: any HybridOneSDKHandleSpec, json: String, handles: [(any HybridOneSDKHandleSpec)], dispatch: @escaping Dispatch
  ) throws -> Promise<OneSDKResult> {
    guard let handle = handle as? HybridOneSDKHandle, let function = handle.box.value as? OneSDKCallable else {
      throw oneNativeError("E_SDK", "expected a callable sdk handle")
    }
    let call = try Self.prepare(json, handles, dispatch)
    return Promise.async { Self.result(try await function.call(call), call) }
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
