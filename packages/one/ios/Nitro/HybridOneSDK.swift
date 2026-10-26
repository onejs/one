import Foundation
import CoreGraphics
import Combine
import NitroModules

// the native surface of the generated sdk bindings: decodes a call, runs the
// framework's generated table and returns the result as a direct nitro value
// or an envelope when nested handles or containers are present
final class HybridOneSDKHandle: HybridOneSDKHandleSpec {
  let box: OneSDKHandleBox
  init(_ box: OneSDKHandleBox) {
    self.box = box
    super.init()
  }
  var typeName: String { box.typeName }
  var identity: String? { box.identity }
  var superclasses: [String]? {
    let names = box.superclassNames
    return names.isEmpty ? nil : names
  }
  var callable: Bool? { box.value is OneSDKCallable ? true : nil }
}

final class HybridOneSDK: HybridOneSDKSpec {
  typealias Dispatch = (_ index: Double, _ data: AnyMap, _ handles: [(any HybridOneSDKHandleSpec)], _ buffers: [ArrayBuffer]) -> Void

  typealias SyncDispatch = (_ index: Double, _ data: AnyMap, _ handles: [(any HybridOneSDKHandleSpec)], _ buffers: [ArrayBuffer]) -> OneSDKResult

  private static func observationError(_ error: Error) -> OneSDKResult {
    OneSDKValues.envelope(failureData(error))
  }

  private static func observationListener(_ listener: @escaping (OneSDKResult) -> Void) -> (Any) -> Void {
    { value in
      let call = OneSDKCall(handles: [])
      listener(OneSDKValues.envelope(["value": call.out(value)], existingHandles: call.handlesOut))
    }
  }

  func observe(module: String, id: Double, data: AnyMap, handles: [(any HybridOneSDKHandleSpec)],
               listener: @escaping (OneSDKResult) -> Void) throws -> () -> Void {
    do {
      let table = try OneSDKTables.table(module)
      let call = try Self.prepareEnvelope(OneSDKResult(data: data, handles: handles, buffers: nil), dispatch: nil)
      let lifetime = OneSDKSubscription()
      DispatchQueue.main.async {
        lifetime.deliver {
          do {
            let observation = try table.observe(Int(id), call, Self.observationListener(listener))
            lifetime.install { observation.cancel() }
          } catch {
            listener(Self.observationError(error))
          }
        }
      }
      return { lifetime.cancel() }
    } catch {
      listener(Self.observationError(error))
      return {}
    }
  }

  func subscribe(handle: any HybridOneSDKHandleSpec, listener: @escaping (OneSDKResult) -> Void) throws -> () -> Void {
    do {
      guard let handle = handle as? HybridOneSDKHandle else {
        throw oneNativeError("E_SDK", "expected a handle from the sdk bindings")
      }
      let subscription = try handle.box.subscribe(Self.observationListener(listener)) { error in
        listener(Self.observationError(error))
      }
      return { subscription.cancel() }
    } catch {
      listener(Self.observationError(error))
      return {}
    }
  }

  private static func boxes(_ handles: [(any HybridOneSDKHandleSpec)]) throws -> [OneSDKHandleBox] {
    try handles.map { handle in
      guard let handle = handle as? HybridOneSDKHandle else { throw oneNativeError("E_SDK", "expected a handle from the sdk bindings") }
      return handle.box
    }
  }

  private static func wrapDispatch(_ dispatch: Dispatch?) -> OneSDKDispatch? {
    dispatch.map { invoke in
      { index, data, handles in
        let env = OneSDKValues.envelope(data, existingHandles: handles)
        invoke(Double(index), env.data, env.handles, env.buffers ?? [])
      }
    }
  }

  private static func prepareEnvelope(
    _ envelope: OneSDKResult, dispatch: Dispatch?, syncDispatch: SyncDispatch? = nil
  ) throws -> OneSDKCall {
    let sync: OneSDKSyncDispatch? = syncDispatch.map { invoke in
      { index, data, handles in
        let env = OneSDKValues.envelope(data, existingHandles: handles)
        let reply = invoke(Double(index), env.data, env.handles, env.buffers ?? [])
        do {
          return OneSDKCallbackReply(
            data: OneSDKValues.dictionary(reply.data),
            handles: try Self.boxes(reply.handles),
            buffers: (reply.buffers ?? []).map { $0.toData(copyIfNeeded: true) }
          )
        } catch {
          return OneSDKCallbackReply(data: ["error": "invalid callback handles", "args": []], handles: [])
        }
      }
    }
    return try OneSDKCall(
      data: OneSDKValues.dictionary(envelope.data),
      handles: boxes(envelope.handles),
      buffers: (envelope.buffers ?? []).map { $0.toData(copyIfNeeded: true) },
      syncDispatch: sync,
      dispatch: wrapDispatch(dispatch)
    )
  }

  private static func prepareCall(
    receiver: OneSDKValue?, arg0: OneSDKValue?, arg1: OneSDKValue?, dispatch: Dispatch?
  ) throws -> OneSDKCall {
    if case .ninth(let envelope) = arg0 {
      return try prepareEnvelope(envelope, dispatch: dispatch)
    }
    let recv = try receiver.map { try OneSDKValues.unpackValue($0) }
    let wrappedDispatch = wrapDispatch(dispatch)
    if let a0 = arg0 {
      if let a1 = arg1 {
        return OneSDKCall(
          receiver: recv,
          argCount: 2,
          arg0: try OneSDKValues.unpackValue(a0),
          arg1: try OneSDKValues.unpackValue(a1),
          dispatch: wrappedDispatch
        )
      }
      return OneSDKCall(
        receiver: recv,
        argCount: 1,
        arg0: try OneSDKValues.unpackValue(a0),
        dispatch: wrappedDispatch
      )
    }
    return OneSDKCall(receiver: recv, argCount: 0, dispatch: wrappedDispatch)
  }

  private static func result(_ value: Any, _ call: OneSDKCall, table: OneSDKTable? = nil, id: Int = 0) -> OneSDKValue {
    call.retainImplementations(table?.argumentNames(id) ?? [])
    return OneSDKValues.packValue(value, existingHandles: call.handlesOut)
  }

  private static func failureData(_ error: Error, context: String? = nil) -> [String: Any] {
    let native = error as NSError
    let description = (error as? RuntimeError)?.description ?? native.localizedDescription
    let message = context.map { "E_SDK: \($0): \(description)" } ?? description
    return ["$error": ["message": message, "code": "E_SDK", "domain": native.domain, "nativeCode": Double(native.code)]]
  }

  private static func failure(_ module: String, _ id: Double, _ error: Error) -> OneSDKValue {
    .ninth(OneSDKValues.envelope(failureData(error, context: "\(module) #\(Int(id))")))
  }

  func call(
    module: String, id: Double, receiver: OneSDKValue?, arg0: OneSDKValue?, arg1: OneSDKValue?, dispatch: Dispatch?
  ) throws -> OneSDKValue {
    do {
      let table = try OneSDKTables.table(module)
      let call = try Self.prepareCall(receiver: receiver, arg0: arg0, arg1: arg1, dispatch: dispatch)
      return Self.result(try table.sync(Int(id), call), call, table: table, id: Int(id))
    } catch {
      return Self.failure(module, id, error)
    }
  }

  func callSync(
    module: String, id: Double, data: OneSDKResult,
    dispatch: @escaping Dispatch, syncDispatch: @escaping SyncDispatch
  ) throws -> OneSDKValue {
    do {
      let table = try OneSDKTables.table(module)
      let call = try Self.prepareEnvelope(data, dispatch: dispatch, syncDispatch: syncDispatch)
      defer { call.endSynchronousCallbacks() }
      return Self.result(try table.sync(Int(id), call), call, table: table, id: Int(id))
    } catch { return Self.failure(module, id, error) }
  }

  func callFunction(
    handle: any HybridOneSDKHandleSpec, arg0: OneSDKValue?, arg1: OneSDKValue?, dispatch: Dispatch?
  ) throws -> Promise<OneSDKValue> {
    do {
      guard let handle = handle as? HybridOneSDKHandle, let function = handle.box.value as? OneSDKCallable else {
        throw oneNativeError("E_SDK", "expected a callable sdk handle")
      }
      let call = try Self.prepareCall(receiver: nil, arg0: arg0, arg1: arg1, dispatch: dispatch)
      return Promise.async {
        do { return Self.result(try await function.call(call), call) }
        catch { return .ninth(OneSDKValues.envelope(Self.failureData(error))) }
      }
    } catch {
      return .resolved(withResult: .ninth(OneSDKValues.envelope(Self.failureData(error))))
    }
  }

  func callAsync(
    module: String, id: Double, receiver: OneSDKValue?, arg0: OneSDKValue?, arg1: OneSDKValue?, dispatch: Dispatch?
  ) throws -> Promise<OneSDKValue> {
    let call: OneSDKCall
    let table: OneSDKTable
    do {
      table = try OneSDKTables.table(module)
      call = try Self.prepareCall(receiver: receiver, arg0: arg0, arg1: arg1, dispatch: dispatch)
    } catch {
      return .resolved(withResult: Self.failure(module, id, error))
    }
    return Promise.async {
      do {
        return Self.result(try await table.async(Int(id), call), call, table: table, id: Int(id))
      } catch {
        return Self.failure(module, id, error)
      }
    }
  }
}

private enum OneSDKValues {
  static func unpackValue(_ value: OneSDKValue) throws -> Any {
    switch value {
    case .first: return NSNull()
    case .second(let bool): return bool
    case .third(let buffer): return buffer.toData(copyIfNeeded: true)
    case .fourth(let handle):
      guard let handle = handle as? HybridOneSDKHandle else {
        throw oneNativeError("E_SDK", "expected a handle from the sdk bindings")
      }
      return handle.box
    case .fifth(let string): return string
    case .sixth(let number): return number
    case .seventh(let rect): return CGRect(x: rect.x, y: rect.y, width: rect.width, height: rect.height)
    case .eigth(let point): return CGPoint(x: point.x, y: point.y)
    case .ninth(let envelope): return dictionary(envelope.data)
    case .tenth(let date): return date
    }
  }

  static func packValue(_ value: Any, existingHandles: [OneSDKHandleBox] = []) -> OneSDKValue {
    if value is NSNull { return .first(.null) }
    let t = type(of: value)
    if t == Bool.self, let b = value as? Bool { return .second(b) }
    if t == Double.self, let d = value as? Double { return .sixth(d) }
    if let s = value as? String { return .fifth(s) }
    if let box = value as? OneSDKHandleBox { return .fourth(HybridOneSDKHandle(box)) }
    if let data = value as? Data, let buffer = try? ArrayBuffer.copy(data: data) { return .third(buffer) }
    if let date = value as? Date { return .tenth(date) }
    if let rect = value as? CGRect {
      return .seventh(OneSDKRect(x: Double(rect.origin.x), y: Double(rect.origin.y), width: Double(rect.size.width), height: Double(rect.size.height)))
    }
    if let point = value as? CGPoint {
      return .eigth(OneSDKPoint(x: Double(point.x), y: Double(point.y)))
    }
    if let number = value as? NSNumber {
      return CFGetTypeID(number) == CFBooleanGetTypeID() ? .second(number.boolValue) : .sixth(number.doubleValue)
    }
    return .ninth(envelope(["value": value], existingHandles: existingHandles))
  }

  static func unpack(_ value: AnyValue) -> Any {
    switch value {
    case .null: return NSNull()
    case .bool(let value): return value
    case .number(let value): return value
    case .int64(let value): return Double(value)
    case .string(let value): return value
    case .array(let value): return value.map(unpack)
    case .object(let value): return value.mapValues(unpack)
    }
  }

  static func dictionary(_ map: AnyMap) -> [String: Any] {
    var result: [String: Any] = [:]
    for key in map.getAllKeys() {
      if map.isNull(key: key) { result[key] = NSNull() }
      else if map.isBool(key: key) { result[key] = map.getBoolean(key: key) }
      else if map.isDouble(key: key) { result[key] = map.getDouble(key: key) }
      else if map.isInt64(key: key) { result[key] = Double(map.getInt64(key: key)) }
      else if map.isString(key: key) { result[key] = map.getString(key: key) }
      else if map.isArray(key: key) { result[key] = map.getArray(key: key).map(unpack) }
      else if map.isObject(key: key) { result[key] = map.getObject(key: key).mapValues(unpack) }
    }
    return result
  }

  static func envelope(_ values: [String: Any], existingHandles: [OneSDKHandleBox] = []) -> OneSDKResult {
    var handles: [(any HybridOneSDKHandleSpec)] = existingHandles.map { HybridOneSDKHandle($0) }
    var buffers: [ArrayBuffer] = []

    func pack(_ value: Any) -> AnyValue {
      if value is NSNull { return .null }
      let t = type(of: value)
      if t == Bool.self, let b = value as? Bool { return .bool(b) }
      if t == Double.self, let d = value as? Double { return .number(d) }
      if let s = value as? String { return .string(s) }
      if let box = value as? OneSDKHandleBox {
        let index = handles.count
        handles.append(HybridOneSDKHandle(box))
        return .object(["$h": .number(Double(index))])
      }
      if let data = value as? Data, let buffer = try? ArrayBuffer.copy(data: data) {
        let index = buffers.count
        buffers.append(buffer)
        return .object(["$b": .number(Double(index))])
      }
      if let date = value as? Date {
        return .object(["$date": .number(date.timeIntervalSince1970 * 1000)])
      }
      if let rect = value as? CGRect {
        return .object([
          "x": .number(Double(rect.origin.x)),
          "y": .number(Double(rect.origin.y)),
          "width": .number(Double(rect.size.width)),
          "height": .number(Double(rect.size.height)),
        ])
      }
      if let point = value as? CGPoint {
        return .object(["x": .number(Double(point.x)), "y": .number(Double(point.y))])
      }
      if let size = value as? CGSize {
        return .object(["width": .number(Double(size.width)), "height": .number(Double(size.height))])
      }
      if let number = value as? NSNumber {
        return CFGetTypeID(number) == CFBooleanGetTypeID() ? .bool(number.boolValue) : .number(number.doubleValue)
      }
      if let array = value as? [Any] { return .array(array.map(pack)) }
      if let dict = value as? [String: Any] { return .object(dict.mapValues(pack)) }
      preconditionFailure("invalid sdk wire value: \(type(of: value))")
    }

    let result = AnyMap(withPreallocatedSize: values.count)
    for (key, value) in values {
      switch pack(value) {
      case .null: result.setNull(key: key)
      case .bool(let v): result.setBoolean(key: key, value: v)
      case .number(let v): result.setDouble(key: key, value: v)
      case .int64(let v): result.setInt64(key: key, value: v)
      case .string(let v): result.setString(key: key, value: v)
      case .array(let v): result.setArray(key: key, value: v)
      case .object(let v): result.setObject(key: key, value: v)
      }
    }
    return OneSDKResult(data: result, handles: handles, buffers: buffers.isEmpty ? nil : buffers)
  }
}

