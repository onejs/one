import Foundation
import Combine
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
  typealias Dispatch = (_ index: Double, _ data: AnyMap, _ handles: [(any HybridOneSDKHandleSpec)]) -> Void

  typealias SyncDispatch = (_ index: Double, _ data: AnyMap, _ handles: [(any HybridOneSDKHandleSpec)]) -> OneSDKResult

  private static func observationListener(_ listener: @escaping (OneSDKResult) -> Void) -> (Any) -> Void {
    { value in
      let call = OneSDKCall(handles: [])
      listener(OneSDKResult(data: OneSDKValues.map(["value": call.out(value)]),
        handles: call.handlesOut.map { HybridOneSDKHandle($0) }))
    }
  }

  func observe(module: String, id: Double, data: AnyMap, handles: [(any HybridOneSDKHandleSpec)], kind: String,
               listener: @escaping (OneSDKResult) -> Void) throws -> () -> Void {
    let table = try OneSDKTables.table(module)
    let call = try Self.prepare(data, handles, { _, _, _ in })
    let lifetime = OneSDKSubscription()
    DispatchQueue.main.async {
      lifetime.deliver {
        do {
          let observation = try table.observe(Int(id), call, kind, Self.observationListener(listener))
          lifetime.install { observation.cancel() }
        } catch {
          listener(OneSDKResult(data: OneSDKValues.map(["error": error.localizedDescription]), handles: []))
        }
      }
    }
    return { lifetime.cancel() }
  }

  func subscribe(handle: any HybridOneSDKHandleSpec, kind: String,
                 listener: @escaping (OneSDKResult) -> Void) throws -> () -> Void {
    guard let handle = handle as? HybridOneSDKHandle else {
      throw oneNativeError("E_SDK", "expected a handle from the sdk bindings")
    }
    let emit = Self.observationListener(listener)
    let fail: (Error) -> Void = { error in
      listener(OneSDKResult(data: OneSDKValues.map(["error": error.localizedDescription]), handles: []))
    }
    let subscription: OneSDKSubscription
    switch kind {
    case "publisher":
      guard let publisher = handle.box.value as? any Publisher else {
        throw oneNativeError("E_SDK", "handle is not a Combine publisher")
      }
      subscription = OneSDKObservations.publisher(publisher, emit, fail)
    case "sequence":
      guard let sequence = handle.box.value as? any AsyncSequence else {
        throw oneNativeError("E_SDK", "handle is not an AsyncSequence")
      }
      subscription = OneSDKObservations.sequence(sequence, emit, fail)
    default: throw oneNativeError("E_SDK", "unknown stream kind \(kind)")
    }
    return { subscription.cancel() }
  }

  private static func boxes(_ handles: [(any HybridOneSDKHandleSpec)]) throws -> [OneSDKHandleBox] {
    try handles.map { handle in
      guard let handle = handle as? HybridOneSDKHandle else { throw oneNativeError("E_SDK", "expected a handle from the sdk bindings") }
      return handle.box
    }
  }

  private static func prepare(
    _ data: AnyMap, _ handles: [(any HybridOneSDKHandleSpec)], _ dispatch: @escaping Dispatch, _ syncDispatch: SyncDispatch? = nil,
    argumentNames: [String]? = nil
  ) throws -> OneSDKCall {
    let sync: OneSDKSyncDispatch? = syncDispatch.map { invoke in
      { index, data, handles in
        let reply = invoke(Double(index), OneSDKValues.map(data), handles.map { HybridOneSDKHandle($0) })
        do { return OneSDKCallbackReply(data: OneSDKValues.dictionary(reply.data), handles: try Self.boxes(reply.handles)) }
        catch { return OneSDKCallbackReply(data: ["error": "invalid callback handles", "args": []], handles: []) }
      }
    }
    return try OneSDKCall(data: OneSDKValues.dictionary(data), handles: boxes(handles), argumentNames: argumentNames, syncDispatch: sync) { index, data, handles in
      dispatch(Double(index), OneSDKValues.map(data), handles.map { HybridOneSDKHandle($0) })
    }
  }

  private static func result(_ value: Any, _ call: OneSDKCall) throws -> OneSDKResult {
    call.retainImplementations()
    return OneSDKResult(data: OneSDKValues.map(["value": value]), handles: call.handlesOut.map { HybridOneSDKHandle($0) })
  }

  private static func failure(_ module: String, _ id: Double, _ error: Error) -> Error {
    oneNativeError("E_SDK", "\(module) #\(Int(id)): \(error.localizedDescription)")
  }

  func call(
    module: String, id: Double, data: AnyMap, handles: [(any HybridOneSDKHandleSpec)], dispatch: @escaping Dispatch
  ) throws -> OneSDKResult {
    do {
      let table = try OneSDKTables.table(module)
      let call = try Self.prepare(data, handles, dispatch, argumentNames: table.argumentNames(Int(id)))
      return try Self.result(try table.sync(Int(id), call), call)
    } catch {
      throw Self.failure(module, id, error)
    }
  }

  func callSync(
    module: String, id: Double, data: AnyMap, handles: [(any HybridOneSDKHandleSpec)],
    dispatch: @escaping Dispatch, syncDispatch: @escaping SyncDispatch
  ) throws -> OneSDKResult {
    do {
      let table = try OneSDKTables.table(module)
      let call = try Self.prepare(data, handles, dispatch, syncDispatch, argumentNames: table.argumentNames(Int(id)))
      defer { call.endSynchronousCallbacks() }
      return try Self.result(try table.sync(Int(id), call), call)
    } catch { throw Self.failure(module, id, error) }
  }

  func callFunction(
    handle: any HybridOneSDKHandleSpec, data: AnyMap, handles: [(any HybridOneSDKHandleSpec)], dispatch: @escaping Dispatch
  ) throws -> Promise<OneSDKResult> {
    guard let handle = handle as? HybridOneSDKHandle, let function = handle.box.value as? OneSDKCallable else {
      throw oneNativeError("E_SDK", "expected a callable sdk handle")
    }
    let call = try Self.prepare(data, handles, dispatch)
    return Promise.async { try Self.result(try await function.call(call), call) }
  }

  func callAsync(
    module: String, id: Double, data: AnyMap, handles: [(any HybridOneSDKHandleSpec)], dispatch: @escaping Dispatch
  ) throws -> Promise<OneSDKResult> {
    let call: OneSDKCall
    let table: OneSDKTable
    do {
      table = try OneSDKTables.table(module)
      call = try Self.prepare(data, handles, dispatch, argumentNames: table.argumentNames(Int(id)))
    } catch {
      throw Self.failure(module, id, error)
    }
    return Promise.async {
      do {
        return try Self.result(try await table.async(Int(id), call), call)
      } catch {
        throw Self.failure(module, id, error)
      }
    }
  }
}

// preserve nulls inside containers and distinguish boxed booleans from numbers.
// nitro's generic Any conversion uses optional containers and numeric casts;
// the sdk wire instead has a closed set of values with explicit null markers.
private enum OneSDKValues {
  static func unpack(_ value: AnyValue) -> Any {
    switch value {
    case .null: return NSNull()
    case .bool(let value): return value
    case .number(let value): return NSNumber(value: value)
    case .int64(let value): return NSNumber(value: value)
    case .string(let value): return value
    case .array(let value): return value.map(unpack)
    case .object(let value): return value.mapValues(unpack)
    }
  }

  static func pack(_ value: Any) -> AnyValue {
    if value is NSNull { return .null }
    if let value = value as? String { return .string(value) }
    if let value = value as? NSNumber {
      return CFGetTypeID(value) == CFBooleanGetTypeID() ? .bool(value.boolValue) : .number(value.doubleValue)
    }
    if let value = value as? [Any] { return .array(value.map(pack)) }
    if let value = value as? [String: Any] { return .object(value.mapValues(pack)) }
    preconditionFailure("invalid sdk wire value: \(type(of: value))")
  }

  static func dictionary(_ map: AnyMap) -> [String: Any] {
    var result: [String: Any] = [:]
    for key in map.getAllKeys() {
      if map.isNull(key: key) { result[key] = NSNull() }
      else if map.isBool(key: key) { result[key] = map.getBoolean(key: key) }
      else if map.isDouble(key: key) { result[key] = map.getDouble(key: key) }
      else if map.isInt64(key: key) { result[key] = map.getInt64(key: key) }
      else if map.isString(key: key) { result[key] = map.getString(key: key) }
      else if map.isArray(key: key) { result[key] = map.getArray(key: key).map(unpack) }
      else if map.isObject(key: key) { result[key] = map.getObject(key: key).mapValues(unpack) }
    }
    return result
  }

  static func map(_ values: [String: Any]) -> AnyMap {
    let result = AnyMap(withPreallocatedSize: values.count)
    for (key, value) in values {
      switch pack(value) {
      case .null: result.setNull(key: key)
      case .bool(let value): result.setBoolean(key: key, value: value)
      case .number(let value): result.setDouble(key: key, value: value)
      case .int64(let value): result.setInt64(key: key, value: value)
      case .string(let value): result.setString(key: key, value: value)
      case .array(let value): result.setArray(key: key, value: value)
      case .object(let value): result.setObject(key: key, value: value)
      }
    }
    return result
  }
}
