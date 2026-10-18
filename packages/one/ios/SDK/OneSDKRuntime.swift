import Foundation
import CoreFoundation
import CoreGraphics
import ObjectiveC
import Combine
import Observation

// the fixed half of the generated sdk bindings. generated tables decode each
// argument with `call.arg(i)`, letting swift infer the parameter's type, and
// encode results with `call.out(value)`. a value with a plain javascript form
// converts through OneSDKBridged; anything else travels as a handle that keeps
// the native value alive until javascript drops it.

public enum OneSDKError: LocalizedError, CustomStringConvertible {
  case badArgument(index: Int, expected: String, got: String)
  case missingArgument(Int)
  case unknownSymbol(String)
  case unsupported(String)
  case callback(String)

  public var description: String {
    switch self {
    case let .badArgument(index, expected, got): return "argument \(index): expected \(expected), got \(got)"
    case let .missingArgument(index): return "argument \(index) is missing"
    case let .unknownSymbol(id): return "unknown sdk symbol \(id)"
    case let .callback(message): return message
    case let .unsupported(what): return "\(what) is not supported"
    }
  }

  public var errorDescription: String? { description }
}

// a native value javascript holds. classes stay identical across calls; values
// (structs, payload enums) are copied in, as swift copies them.
public final class OneSDKHandleBox {
  public var value: Any {
    didSet { cachedTypeName = nil }
  }
  public let identity: String
  private static let sequenceLock = NSLock()
  private var sequenceObservation: OneSDKSequenceObservation?
  private var cachedTypeName: String?

  public init(_ value: Any) {
    self.value = value
    self.identity = OneSDKObjectIdentity.identity(value)
  }

  // a Combine publisher gets one sink per subscriber; an AsyncSequence shares
  // one iterator across subscribers
  public func subscribe(_ emit: @escaping (Any) -> Void, _ fail: @escaping (Error) -> Void) throws -> OneSDKSubscription {
    if let publisher = value as? any Publisher { return OneSDKObservations.publisher(publisher, emit, fail) }
    Self.sequenceLock.lock()
    guard let sequence = value as? any AsyncSequence else {
      Self.sequenceLock.unlock()
      throw OneSDKError.unsupported("handle is neither a Combine publisher nor an AsyncSequence")
    }
    if sequenceObservation == nil { sequenceObservation = OneSDKSequenceObservation(sequence) }
    let observation = sequenceObservation!
    Self.sequenceLock.unlock()
    return observation.subscribe(emit, fail)
  }
  public var typeName: String {
    if let cachedTypeName { return cachedTypeName }
    let name = String(reflecting: type(of: value))
    cachedTypeName = name
    return name
  }
  // a class instance's superclasses, nearest first, so javascript wraps a
  // private subclass (an sdk often returns one) in the nearest class it knows
  public var superclassNames: [String] {
    guard let type = type(of: value) as? AnyClass else { return [] }
    var names: [String] = []
    var at: AnyClass? = class_getSuperclass(type)
    while let current = at, current != NSObject.self {
      names.append(String(reflecting: current))
      at = class_getSuperclass(current)
    }
    return names
  }
}

// weak pointer keys distinguish native references without retaining them or
// reusing an address after deallocation. swift value handles have their own id.
private enum OneSDKObjectIdentity {
  private static let lock = NSLock()
  nonisolated(unsafe) private static let identities = NSMapTable<AnyObject, NSString>(
    keyOptions: [.weakMemory, .objectPointerPersonality], valueOptions: .strongMemory)

  static func identity(_ value: Any) -> String {
    guard type(of: value) is AnyClass else { return UUID().uuidString }
    let object = value as AnyObject
    lock.lock()
    defer { lock.unlock() }
    if let identity = identities.object(forKey: object) { return identity as String }
    let identity = UUID().uuidString
    identities.setObject(identity as NSString, forKey: object)
    return identity
  }
}

// calls the javascript function a call's arguments named {"$f": index}, with
// encoded arguments
public struct OneSDKCallbackReply {
  public let data: [String: Any]
  public let handles: [OneSDKHandleBox]
  public let buffers: [Data]
  public init(data: [String: Any], handles: [OneSDKHandleBox], buffers: [Data] = []) {
    self.data = data
    self.handles = handles
    self.buffers = buffers
  }
}

public typealias OneSDKSyncDispatch = (_ index: Int, _ data: [String: Any], _ handles: [OneSDKHandleBox]) -> OneSDKCallbackReply

public typealias OneSDKDispatch = (_ index: Int, _ data: [String: Any], _ handles: [OneSDKHandleBox]) -> Void

public protocol OneSDKBridged {
  static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Self
  func toJS(_ call: OneSDKCall) -> Any
}

// weak sdk properties do not own javascript implementations. retain them on
// the object receiving the argument, replacing only that named argument slot.
private final class OneSDKRetainedImplementations: NSObject {
  let slots: [String: [Any]]
  init(_ slots: [String: [Any]]) { self.slots = slots }

  private static let lock = NSLock()
  nonisolated(unsafe) private static var associationKey: UInt8 = 0
  nonisolated(unsafe) private(set) static var hasAny = false

  static func hasRetained(on owner: NSObject) -> Bool {
    guard hasAny else { return false }
    lock.lock()
    defer { lock.unlock() }
    return objc_getAssociatedObject(owner, &associationKey) != nil
  }

  static func update(_ changed: [String: [Any]], on owner: NSObject) {
    guard !changed.isEmpty else { return }
    lock.lock()
    let previous = objc_getAssociatedObject(owner, &associationKey) as? OneSDKRetainedImplementations
    var slots = previous?.slots ?? [:]
    for (name, values) in changed {
      slots[name] = values.isEmpty ? nil : values
    }
    if !slots.isEmpty { hasAny = true }
    objc_setAssociatedObject(owner, &associationKey, slots.isEmpty ? nil : OneSDKRetainedImplementations(slots), .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    lock.unlock()
    // release replaced implementations outside the lock; their teardown can reenter.
    withExtendedLifetime(previous) {}
  }
}

// one invocation: the decoded arguments and the handles going back
public final class OneSDKCall {
  private let argCount: Int
  private let arg0Value: Any
  private let arg1Value: Any
  private let overflowValues: [Any]
  let receiverValue: Any?
  let handlesIn: [OneSDKHandleBox]
  let buffersIn: [Data]
  let dispatch: OneSDKDispatch?
  let syncDispatch: OneSDKSyncDispatch?
  private let argumentNames: [String]?
  private var accessedArgs: UInt64 = 0
  private var implementations: [Int: [Any]] = [:]
  private var implementationResult: NSObject?
  private let callbackThread: Thread?
  private let callbackLock: NSLock?
  private var synchronousCallbacksActive = true
  private var callbackFailure: Error?
  public private(set) var handlesOut: [OneSDKHandleBox] = []

  public init(
    receiver: Any?,
    argCount: Int,
    arg0: Any = NSNull(),
    arg1: Any = NSNull(),
    dispatch: OneSDKDispatch? = nil
  ) {
    self.receiverValue = receiver
    self.argCount = argCount
    self.arg0Value = arg0
    self.arg1Value = arg1
    self.overflowValues = []
    self.handlesIn = []
    self.buffersIn = []
    self.argumentNames = nil
    self.dispatch = dispatch
    self.syncDispatch = nil
    self.callbackThread = nil
    self.callbackLock = nil
  }

  public init(
    data: [String: Any],
    handles: [OneSDKHandleBox],
    buffers: [Data] = [],
    argumentNames: [String]? = nil,
    syncDispatch: OneSDKSyncDispatch? = nil,
    dispatch: OneSDKDispatch? = nil
  ) throws {
    if let error = data["error"] as? String { throw OneSDKError.callback(error) }
    let args = data["args"] as? [Any] ?? []
    self.argCount = args.count
    self.arg0Value = args.count > 0 ? args[0] : NSNull()
    self.arg1Value = args.count > 1 ? args[1] : NSNull()
    self.overflowValues = args.count > 2 ? args : []
    self.argumentNames = argumentNames
    self.receiverValue = data["self"]
    self.handlesIn = handles
    self.buffersIn = buffers
    self.dispatch = dispatch
    self.syncDispatch = syncDispatch
    self.callbackThread = syncDispatch != nil ? Thread.current : nil
    self.callbackLock = syncDispatch != nil ? NSLock() : nil
  }

  // a fresh call for encoding callback arguments
  init(handles: [OneSDKHandleBox]) {
    self.argCount = 0
    self.arg0Value = NSNull()
    self.arg1Value = NSNull()
    self.overflowValues = []
    self.argumentNames = nil
    self.receiverValue = nil
    self.handlesIn = handles
    self.buffersIn = []
    self.dispatch = nil
    self.syncDispatch = nil
    self.callbackThread = nil
    self.callbackLock = nil
  }

  @inline(__always)
  private func valueAt(_ index: Int) -> Any {
    switch index {
    case 0: return arg0Value
    case 1: return arg1Value
    default: return overflowValues[index]
    }
  }

  public func has(_ index: Int) -> Bool {
    index >= 0 && index < argCount && !(valueAt(index) is NSNull)
  }

  public func arg<T>(_ index: Int) throws -> T {
    if index >= 0 && index < 64 { accessedArgs |= (1 << index) }
    guard index >= 0 && index < argCount else {
      if let none = OneSDKConvert.none(T.self) { return none }
      throw OneSDKError.missingArgument(index)
    }
    return try OneSDKConvert.from(valueAt(index), as: T.self, self, index: index)
  }

  func retainImplementation(_ value: Any, index: Int) {
    implementations[index, default: []].append(value)
  }

  private func nativeObject(_ value: Any) -> NSObject? {
    if let optional = value as? OneSDKOptional { return optional.unwrapped.flatMap(nativeObject) }
    guard type(of: value) is AnyClass else { return nil }
    return value as? NSObject
  }

  public func retainImplementations(_ fallbackNames: @autoclosure () -> [String] = []) {
    if implementations.isEmpty && !OneSDKRetainedImplementations.hasAny { return }
    guard accessedArgs != 0 || !implementations.isEmpty else { return }
    let receiver = receiverValue.flatMap { handle($0) }.flatMap { nativeObject($0.value) }
    guard let owner = receiver ?? implementationResult else { return }
    if implementations.isEmpty && !OneSDKRetainedImplementations.hasRetained(on: owner) { return }
    let names = argumentNames ?? {
      let resolved = fallbackNames()
      return resolved.isEmpty ? (0..<argCount).map(String.init) : resolved
    }()
    var slots: [String: [Any]] = [:]
    for index in 0..<min(names.count, 64) where (accessedArgs & (1 << index)) != 0 || implementations[index] != nil {
      slots[names[index]] = implementations[index] ?? []
    }
    OneSDKRetainedImplementations.update(slots, on: owner)
    implementations.removeAll()
  }

  public func arg<T>(_ index: Int, or fallback: @autoclosure () -> T) throws -> T {
    if index >= 0 && index < 64 { accessedArgs |= (1 << index) }
    guard index >= 0 && index < argCount else { return fallback() }
    let v = valueAt(index)
    // javascript sends an omitted argument as null: a parameter that can hold
    // nil takes it, any other takes its default
    if v is NSNull { return (try? OneSDKConvert.from(v, as: T.self, self, index: index)) ?? fallback() }
    return try OneSDKConvert.from(v, as: T.self, self, index: index)
  }

  public func receiver<T>() throws -> T {
    if let box = receiverValue as? OneSDKHandleBox {
      if let typed = box.value as? T { return typed }
      throw OneSDKError.badArgument(index: -1, expected: String(reflecting: T.self), got: box.typeName)
    }
    return try OneSDKConvert.from(receiverValue ?? NSNull(), as: T.self, self, index: -1)
  }

  // writes a mutated struct receiver back to the handle javascript holds
  public func setReceiver(_ value: Any) {
    if let box = receiverValue as? OneSDKHandleBox {
      box.value = value
    } else if let ref = receiverValue, let box = handle(ref) {
      box.value = value
    }
  }

  public func callback(_ index: Int) throws -> OneSDKFunction {
    try callback(index >= 0 && index < argCount ? valueAt(index) : NSNull(), index: index)
  }

  func callback(_ value: Any, index: Int) throws -> OneSDKFunction {
    guard let ref = value as? [String: Any], let at = OneSDKConvert.int(ref["$f"]), at >= 0, let dispatch else {
      throw OneSDKError.badArgument(index: index, expected: "function", got: OneSDKConvert.describe(value))
    }
    return OneSDKFunction(sync: { [weak self] data, handles in
      guard let self else { throw OneSDKError.unsupported("synchronous callback after its call") }
      self.callbackLock?.lock()
      let active = self.synchronousCallbacksActive
      self.callbackLock?.unlock()
      guard active, let thread = self.callbackThread, Thread.current === thread, let sync = self.syncDispatch else {
        throw OneSDKError.unsupported("synchronous callback outside its JS-thread call")
      }
      let reply = sync(at, data, handles)
      return try OneSDKCall(data: reply.data, handles: reply.handles, buffers: reply.buffers, dispatch: dispatch)
    }) { data, handles in dispatch(at, data, handles) }
  }

  public func endSynchronousCallbacks() {
    callbackLock?.lock()
    synchronousCallbacksActive = false
    callbackLock?.unlock()
  }

  public func failCallback(_ error: Error) {
    callbackLock?.lock()
    if callbackFailure == nil { callbackFailure = error }
    callbackLock?.unlock()
  }

  public func checkCallbacks() throws {
    callbackLock?.lock()
    let error = callbackFailure
    callbackLock?.unlock()
    if let error { throw error }
  }

  public func keyPath<T>(_ index: Int, _ paths: [String: T]) throws -> T {
    guard index >= 0 && index < argCount else { throw OneSDKError.missingArgument(index) }
    if let name = valueAt(index) as? String {
      guard let path = paths[name] else { throw OneSDKError.badArgument(index: index, expected: paths.keys.sorted().joined(separator: " | "), got: name) }
      return path
    }
    return try arg(index)
  }

  func handle(_ ref: Any) -> OneSDKHandleBox? {
    if let box = ref as? OneSDKHandleBox { return box }
    guard let ref = ref as? [String: Any], let index = OneSDKConvert.int(ref["$h"]), index >= 0, index < handlesIn.count else { return nil }
    return handlesIn[index]
  }

  public func out(_ value: Any?) -> Any {
    if !implementations.isEmpty, implementationResult == nil, let value { implementationResult = nativeObject(value) }
    return OneSDKConvert.to(value, self)
  }

  // a declared class result stays the object its facade types, though a cast would
  // bridge an NSString, NSNumber, NSArray or NSDictionary to a plain value
  public func out<T: AnyObject>(_ value: T?) -> Any {
    guard let value else { return NSNull() }
    if !implementations.isEmpty, implementationResult == nil { implementationResult = nativeObject(value) }
    return OneSDKHandleBox(value)
  }

  public let void: Any = NSNull()

  // a call that writes through out parameters answers {"$ret": result, "$out": {name: value}}
  public func outs(_ value: Any?, _ written: [String: Any?]) -> Any {
    ["$ret": out(value), "$out": written.mapValues { out($0) }]
  }

  func addHandle(_ box: OneSDKHandleBox) -> Any {
    box
  }
}

// a javascript function held by native code
public final class OneSDKFunction {
  let send: (_ data: [String: Any], _ handles: [OneSDKHandleBox]) -> Void
  let sync: ((_ data: [String: Any], _ handles: [OneSDKHandleBox]) throws -> OneSDKCall)?
  init(sync: ((_ data: [String: Any], _ handles: [OneSDKHandleBox]) throws -> OneSDKCall)? = nil,
       _ send: @escaping (_ data: [String: Any], _ handles: [OneSDKHandleBox]) -> Void) { self.send = send; self.sync = sync }

  public func response(_ args: [Any?]) throws -> OneSDKCall {
    guard let sync else { throw OneSDKError.unsupported("synchronous callback dispatcher is missing") }
    let call = OneSDKCall(handles: [])
    return try sync(["args": args.map { call.out($0) }], call.handlesOut)
  }

  public func result<T>(_ args: [Any?], as: T.Type = T.self) throws -> T {
    try response(args).arg(0)
  }

  public func callAsFunction(_ args: Any?...) {
    let call = OneSDKCall(handles: [])
    let encoded = args.map { call.out($0) }
    send(["args": encoded], call.handlesOut)
  }
}

// a typed native closure captured by generated code and invoked through its handle.
public final class OneSDKCallable {
  private let body: (OneSDKCall) async throws -> Any
  private init(_ body: @escaping (OneSDKCall) async throws -> Any) { self.body = body }
  public static func capture<T>(_ value: T, _ body: @escaping (T, OneSDKCall) async throws -> Any) -> OneSDKCallable {
    OneSDKCallable { call in try await body(value, call) }
  }
  public func call(_ call: OneSDKCall) async throws -> Any { try await body(call) }
}

// generated factory classes are found lazily, including protocols from another
// module than the table decoding the argument. the usr gives each a unique name.
public protocol OneSDKImplementationFactory: NSObject {
  static func make(_ methods: [String: OneSDKFunction]) throws -> Any
}

public enum OneSDKImplementations {
  private static let lock = NSLock()
  nonisolated(unsafe) private static var factories: [String: OneSDKImplementationFactory.Type] = [:]

  public static func validate(_ methods: [String: OneSDKFunction], required: [String], accepted: [String]) throws {
    for title in required where methods[title] == nil {
      throw OneSDKError.unsupported("missing protocol method \(title)")
    }
    for title in methods.keys where !accepted.contains(title) {
      throw OneSDKError.unsupported("protocol method \(title)")
    }
  }

  static func make(_ usr: String, methods: [String: Any], call: OneSDKCall, index: Int) throws -> Any {
    lock.lock()
    let factory: OneSDKImplementationFactory.Type?
    if let registered = factories[usr] { factory = registered }
    else {
      let name = "OneSDKFactory_" + usr.utf8.map { String(format: "%02x", $0) }.joined()
      factory = NSClassFromString(name) as? OneSDKImplementationFactory.Type
      if let factory { factories[usr] = factory }
    }
    lock.unlock()
    guard let factory else { throw OneSDKError.unsupported("protocol implementation \(usr) (not linked or not implementable)") }
    let callbacks = try methods.mapValues { try call.callback($0, index: index) }
    return try factory.make(callbacks)
  }
}

// containers convert element by element, whatever their element type
protocol OneSDKOptional {
  static var oneSDKNone: Self { get }
  static func wrap(_ value: Any, _ call: OneSDKCall, index: Int) throws -> Self
  var unwrapped: Any? { get }
}

extension Optional: OneSDKOptional {
  static var oneSDKNone: Self { nil }
  static func wrap(_ value: Any, _ call: OneSDKCall, index: Int) throws -> Self {
    value is NSNull ? nil : try OneSDKConvert.from(value, as: Wrapped.self, call, index: index)
  }
  var unwrapped: Any? { self.map { $0 as Any } }
}

protocol OneSDKSequence {
  static func build(_ items: [Any], _ call: OneSDKCall, index: Int) throws -> Self
  var items: [Any] { get }
}

extension Array: OneSDKSequence {
  static func build(_ items: [Any], _ call: OneSDKCall, index: Int) throws -> Self {
    try items.map { try OneSDKConvert.from($0, as: Element.self, call, index: index) }
  }
  var items: [Any] { map { $0 as Any } }
}

extension Set: OneSDKSequence {
  static func build(_ items: [Any], _ call: OneSDKCall, index: Int) throws -> Self {
    Set(try items.map { try OneSDKConvert.from($0, as: Element.self, call, index: index) })
  }
  var items: [Any] { map { $0 as Any } }
}

protocol OneSDKDictionary {
  static func build(_ entries: [String: Any], _ call: OneSDKCall, index: Int) throws -> Self
  var entries: [String: Any] { get }
}

extension Dictionary: OneSDKDictionary {
  static func build(_ entries: [String: Any], _ call: OneSDKCall, index: Int) throws -> Self {
    var out: [Key: Value] = [:]
    for (key, value) in entries {
      out[try OneSDKConvert.from(key, as: Key.self, call, index: index)] = try OneSDKConvert.from(value, as: Value.self, call, index: index)
    }
    return out
  }
  var entries: [String: Any] {
    var out: [String: Any] = [:]
    for (key, value) in self { out["\(key)"] = value }
    return out
  }
}

public enum OneSDKConvert {
  static func none<T>(_ type: T.Type) -> T? {
    (T.self as? OneSDKOptional.Type)?.oneSDKNone as? T
  }

  static func describe(_ value: Any?) -> String {
    guard let value else { return "nothing" }
    return String(describing: type(of: value))
  }

  @inline(__always)
  static func bool(_ value: Any?) -> Bool? {
    guard let value else { return nil }
    if type(of: value) == Bool.self, let b = value as? Bool { return b }
    if let number = value as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() { return number.boolValue }
    return nil
  }

  @inline(__always)
  static func double(_ value: Any?) -> Double? {
    guard let value else { return nil }
    let t = type(of: value)
    if t == Double.self, let d = value as? Double { return d }
    if t == Int.self, let i = value as? Int { return Double(i) }
    if t == Int64.self, let i = value as? Int64 { return Double(i) }
    if t == CGFloat.self, let f = value as? CGFloat { return Double(f) }
    if t != Bool.self, let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() {
      return number.doubleValue
    }
    return nil
  }

  @inline(__always)
  static func int(_ value: Any?) -> Int? {
    guard let value else { return nil }
    let t = type(of: value)
    if t == Int.self, let i = value as? Int { return i }
    if t == Double.self, let d = value as? Double { return Int(d) }
    if t == Int64.self, let i = value as? Int64 { return Int(i) }
    if t != Bool.self, let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() {
      return number.intValue
    }
    return nil
  }

  static func fields(_ value: Any, _ names: [String]) throws -> [Double] {
    guard let dict = value as? [String: Any] else {
      throw OneSDKError.badArgument(index: -1, expected: "{ \(names.joined(separator: ", ")) }", got: describe(value))
    }
    var out: [Double] = []
    out.reserveCapacity(names.count)
    for name in names {
      guard let raw = dict[name], let d = double(raw) else {
        throw OneSDKError.badArgument(index: -1, expected: "{ \(names.joined(separator: ", ")) }", got: describe(value))
      }
      out.append(d)
    }
    return out
  }

  public static func from<T>(_ value: Any, as type: T.Type, _ call: OneSDKCall, index: Int) throws -> T {
    if T.self == String.self {
      guard let s = value as? String else { throw OneSDKError.badArgument(index: index, expected: "string", got: describe(value)) }
      return s as! T
    }
    if T.self == Double.self {
      guard let d = double(value) else { throw OneSDKError.badArgument(index: index, expected: "number", got: describe(value)) }
      return d as! T
    }
    if T.self == Int.self {
      guard let d = double(value) else { throw OneSDKError.badArgument(index: index, expected: "number", got: describe(value)) }
      return Int(d) as! T
    }
    if T.self == Bool.self {
      guard let b = bool(value) else { throw OneSDKError.badArgument(index: index, expected: "boolean", got: describe(value)) }
      return b as! T
    }
    if T.self == CGRect.self {
      return try CGRect.fromJS(value, call) as! T
    }
    if T.self == CGPoint.self {
      return try CGPoint.fromJS(value, call) as! T
    }
    if T.self == Data.self {
      return try Data.fromJS(value, call) as! T
    }
    if T.self == Date.self {
      return try Date.fromJS(value, call) as! T
    }
    if let optional = T.self as? OneSDKOptional.Type {
      return try optional.wrap(value, call, index: index) as! T
    }
    if let box = call.handle(value) {
      if let typed = box.value as? T { return typed }
      throw OneSDKError.badArgument(index: index, expected: String(reflecting: T.self), got: box.typeName)
    }
    if let ref = value as? [String: Any], let usr = ref["$impl"] as? String {
      guard let methods = ref["methods"] as? [String: Any] else {
        throw OneSDKError.badArgument(index: index, expected: "protocol methods", got: describe(ref["methods"]))
      }
      let implementation = try OneSDKImplementations.make(usr, methods: methods, call: call, index: index)
      guard let typed = implementation as? T else {
        throw OneSDKError.badArgument(index: index, expected: String(reflecting: T.self), got: String(reflecting: Swift.type(of: implementation)))
      }
      call.retainImplementation(implementation, index: index)
      return typed
    }
    if T.self == Any.self || T.self == AnyObject.self {
      if let rect = value as? CGRect {
        let dict: [String: Double] = ["x": Double(rect.origin.x), "y": Double(rect.origin.y), "width": Double(rect.size.width), "height": Double(rect.size.height)]
        if let typed = dict as? T { return typed }
      }
      if let point = value as? CGPoint {
        let dict: [String: Double] = ["x": Double(point.x), "y": Double(point.y)]
        if let typed = dict as? T { return typed }
      }
      if let ref = value as? [String: Any] {
        if let idx = int(ref["$b"]), idx >= 0, idx < call.buffersIn.count, let typed = call.buffersIn[idx] as? T {
          return typed
        }
        if ref["$date"] != nil, let date = try? Date.fromJS(value, call), let typed = date as? T {
          return typed
        }
      }
      if let typed = value as? T { return typed }
    }
    if let bridged = T.self as? OneSDKBridged.Type {
      do {
        return try bridged.fromJS(value, call) as! T
      } catch OneSDKError.badArgument(index: -1, let expected, let got) where index >= 0 {
        throw OneSDKError.badArgument(index: index, expected: expected, got: got)
      }
    }
    if let sequence = T.self as? OneSDKSequence.Type, let items = value as? [Any] {
      return try sequence.build(items, call, index: index) as! T
    }
    if let dictionary = T.self as? OneSDKDictionary.Type {
      if let entries = value as? [String: Any] {
        return try dictionary.build(entries, call, index: index) as! T
      }
      if let rect = value as? CGRect {
        return try dictionary.build(["x": Double(rect.origin.x), "y": Double(rect.origin.y), "width": Double(rect.size.width), "height": Double(rect.size.height)], call, index: index) as! T
      }
      if let point = value as? CGPoint {
        return try dictionary.build(["x": Double(point.x), "y": Double(point.y)], call, index: index) as! T
      }
    }
    // `Any` and foundation-typed values pass through in their bridge value form
    if let typed = value as? T { return typed }
    throw OneSDKError.badArgument(index: index, expected: String(reflecting: T.self), got: describe(value))
  }

  public static func to(_ value: Any?, _ call: OneSDKCall) -> Any {
    guard let value else { return NSNull() }
    let t = type(of: value)
    if t == String.self || t == Bool.self || t == Double.self || t == Data.self || t == Date.self || t == CGRect.self || t == CGPoint.self || t == CGSize.self {
      return value
    }
    if t == Int.self, let v = value as? Int { return Double(v) }
    if t == CGFloat.self, let v = value as? CGFloat { return Double(v) }
    if t == Float.self, let v = value as? Float { return Double(v) }
    if let optional = value as? OneSDKOptional {
      return to(optional.unwrapped, call)
    }
    if let bridged = value as? OneSDKBridged { return bridged.toJS(call) }
    if let sequence = value as? OneSDKSequence { return sequence.items.map { to($0, call) } }
    if let dictionary = value as? OneSDKDictionary { return dictionary.entries.mapValues { to($0, call) } }
    if value is NSNull { return value }
    if let string = value as? String { return string }
    if let number = value as? NSNumber { return number }
    if let array = value as? NSArray { return array.map { to($0, call) } }
    if let dictionary = value as? NSDictionary {
      var out: [String: Any] = [:]
      for (key, item) in dictionary { out["\(key)"] = to(item, call) }
      return out
    }
    return call.addHandle(OneSDKHandleBox(value))
  }
}

// values with a plain javascript form
extension Bool: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Bool {
    guard let b = OneSDKConvert.bool(value) else { throw OneSDKError.badArgument(index: -1, expected: "boolean", got: OneSDKConvert.describe(value)) }
    return b
  }
  public func toJS(_ call: OneSDKCall) -> Any { self }
}

// the c booleans an objective-c signature or out parameter carries cross as a boolean
extension ObjCBool: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> ObjCBool { ObjCBool(try Bool.fromJS(value, call)) }
  public func toJS(_ call: OneSDKCall) -> Any { boolValue }
}

extension DarwinBoolean: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> DarwinBoolean { DarwinBoolean(try Bool.fromJS(value, call)) }
  public func toJS(_ call: OneSDKCall) -> Any { boolValue }
}

public protocol OneSDKNumber: OneSDKBridged {
  init(_ double: Double)
  var double: Double { get }
}

extension OneSDKNumber {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Self {
    guard let d = OneSDKConvert.double(value) else {
      throw OneSDKError.badArgument(index: -1, expected: "number", got: OneSDKConvert.describe(value))
    }
    return Self(d)
  }
  public func toJS(_ call: OneSDKCall) -> Any { double }
}

extension Double: OneSDKNumber { public var double: Double { self } }
extension Float: OneSDKNumber { public var double: Double { Double(self) } }
extension CGFloat: OneSDKNumber { public var double: Double { Double(self) } }
extension Int: OneSDKNumber { public var double: Double { Double(self) } }
extension Int8: OneSDKNumber { public var double: Double { Double(self) } }
extension Int16: OneSDKNumber { public var double: Double { Double(self) } }
extension Int32: OneSDKNumber { public var double: Double { Double(self) } }
extension Int64: OneSDKNumber { public var double: Double { Double(self) } }
extension UInt: OneSDKNumber { public var double: Double { Double(self) } }
extension UInt8: OneSDKNumber { public var double: Double { Double(self) } }
extension UInt16: OneSDKNumber { public var double: Double { Double(self) } }
extension UInt32: OneSDKNumber { public var double: Double { Double(self) } }
extension UInt64: OneSDKNumber { public var double: Double { Double(self) } }

extension String: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> String {
    guard let string = value as? String else { throw OneSDKError.badArgument(index: -1, expected: "string", got: OneSDKConvert.describe(value)) }
    return string
  }
  public func toJS(_ call: OneSDKCall) -> Any { self }
}

extension Date: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Date {
    if let date = value as? Date { return date }
    guard let ref = value as? [String: Any], let ms = OneSDKConvert.double(ref["$date"]) else {
      throw OneSDKError.badArgument(index: -1, expected: "Date", got: OneSDKConvert.describe(value))
    }
    return Date(timeIntervalSince1970: ms / 1000)
  }
  public func toJS(_ call: OneSDKCall) -> Any { self }
}

extension Data: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Data {
    if let data = value as? Data { return data }
    if let ref = value as? [String: Any], let index = OneSDKConvert.int(ref["$b"]), index >= 0, index < call.buffersIn.count {
      return call.buffersIn[index]
    }
    throw OneSDKError.badArgument(index: -1, expected: "ArrayBuffer", got: OneSDKConvert.describe(value))
  }
  public func toJS(_ call: OneSDKCall) -> Any { self }
}

extension URL: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> URL {
    guard let text = value as? String, let url = URL(string: text) else {
      throw OneSDKError.badArgument(index: -1, expected: "url string", got: OneSDKConvert.describe(value))
    }
    return url
  }
  public func toJS(_ call: OneSDKCall) -> Any { absoluteString }
}

extension UUID: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> UUID {
    guard let text = value as? String, let uuid = UUID(uuidString: text) else {
      throw OneSDKError.badArgument(index: -1, expected: "uuid string", got: OneSDKConvert.describe(value))
    }
    return uuid
  }
  public func toJS(_ call: OneSDKCall) -> Any { uuidString }
}

extension CGPoint: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> CGPoint {
    if let point = value as? CGPoint { return point }
    let v = try OneSDKConvert.fields(value, ["x", "y"])
    return CGPoint(x: v[0], y: v[1])
  }
  public func toJS(_ call: OneSDKCall) -> Any { self }
}

extension CGSize: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> CGSize {
    if let size = value as? CGSize { return size }
    let v = try OneSDKConvert.fields(value, ["width", "height"])
    return CGSize(width: v[0], height: v[1])
  }
  public func toJS(_ call: OneSDKCall) -> Any { self }
}

extension CGRect: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> CGRect {
    if let rect = value as? CGRect { return rect }
    let v = try OneSDKConvert.fields(value, ["x", "y", "width", "height"])
    return CGRect(x: v[0], y: v[1], width: v[2], height: v[3])
  }
  public func toJS(_ call: OneSDKCall) -> Any { self }
}

extension CGVector: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> CGVector {
    if let vector = value as? CGVector { return vector }
    let v = try OneSDKConvert.fields(value, ["dx", "dy"])
    return CGVector(dx: v[0], dy: v[1])
  }
  public func toJS(_ call: OneSDKCall) -> Any { ["dx": Double(dx), "dy": Double(dy)] }
}

extension NSRange: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> NSRange {
    if let range = value as? NSRange { return range }
    let v = try OneSDKConvert.fields(value, ["location", "length"])
    return NSRange(location: Int(v[0]), length: Int(v[1]))
  }
  public func toJS(_ call: OneSDKCall) -> Any { ["location": Double(location), "length": Double(length)] }
}


// generated enums map case names both ways
public protocol OneSDKNamedCases: OneSDKBridged {
  static var oneSDKCases: [(String, Self)] { get }
}

extension OneSDKNamedCases {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Self {
    guard let name = value as? String, let match = oneSDKCases.first(where: { $0.0 == name }) else {
      throw OneSDKError.badArgument(index: -1, expected: oneSDKCases.map(\.0).joined(separator: " | "), got: "\(value)")
    }
    return match.1
  }
}

extension OneSDKNamedCases where Self: Equatable {
  public func toJS(_ call: OneSDKCall) -> Any {
    Self.oneSDKCases.first(where: { $0.1 == self })?.0 ?? NSNull()
  }
}

// generated option sets map to arrays of their named members
public protocol OneSDKNamedOptions: OneSDKBridged, OptionSet where Element == Self {
  static var oneSDKOptions: [(String, Self)] { get }
}

extension OneSDKNamedOptions {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Self {
    var out: Self = []
    for name in value as? [String] ?? [] {
      guard let match = oneSDKOptions.first(where: { $0.0 == name }) else {
        throw OneSDKError.badArgument(index: -1, expected: oneSDKOptions.map(\.0).joined(separator: " | "), got: name)
      }
      out.insert(match.1)
    }
    return out
  }
  public func toJS(_ call: OneSDKCall) -> Any {
    Self.oneSDKOptions.filter { !$0.1.isEmpty && contains($0.1) }.map(\.0)
  }
}

// generated raw-value constants (objective-c typed string and number enums)
// take a member name or any raw value
public protocol OneSDKNamedConstants: OneSDKBridged, RawRepresentable where RawValue: OneSDKBridged & Equatable {
  static var oneSDKConstants: [(String, Self)] { get }
}

extension OneSDKNamedConstants {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Self {
    if let name = value as? String, let match = oneSDKConstants.first(where: { $0.0 == name }) { return match.1 }
    guard let raw = Self(rawValue: try RawValue.fromJS(value, call)) else {
      throw OneSDKError.badArgument(index: -1, expected: oneSDKConstants.map(\.0).joined(separator: " | "), got: "\(value)")
    }
    return raw
  }
  // the raw value is the identity: a constant name aliases one, and values no constant
  // names, such as a third-party activity type, have only the raw value
  public func toJS(_ call: OneSDKCall) -> Any { rawValue.toJS(call) }
}

// each framework's generated table, found by name so an app links only the
// frameworks it imports
public protocol OneSDKTable: NSObject {
  @MainActor func observe(_ id: Int, _ call: OneSDKCall, _ emit: @escaping (Any) -> Void) throws -> OneSDKSubscription
  func argumentNames(_ id: Int) -> [String]
  func sync(_ id: Int, _ call: OneSDKCall) throws -> Any
  func async(_ id: Int, _ call: OneSDKCall) async throws -> Any
}

public enum OneSDKTables {
  private static let lock = NSLock()
  nonisolated(unsafe) private static var tables: [String: OneSDKTable] = [:]

  public static func table(_ module: String) throws -> OneSDKTable {
    lock.lock()
    defer { lock.unlock() }
    if let table = tables[module] { return table }
    guard let type = NSClassFromString("OneSDKTable_\(module)") as? OneSDKTable.Type else {
      throw OneSDKError.unsupported("\(module) (not linked into this app; rebuild after importing it)")
    }
    let table = type.init()
    tables[module] = table
    return table
  }
}

// one cancellable lifetime shared by observation, publishers and async sequences.
// cancel gates delivery before releasing the native subscription or task.
public final class OneSDKSubscription: @unchecked Sendable {
  private let lock = NSRecursiveLock()
  private var active = true
  private var cleanup: (() -> Void)?

  public init() {}
  deinit { cancel() }

  public func install(_ cleanup: @escaping () -> Void) {
    lock.lock()
    if active {
      self.cleanup = cleanup
      lock.unlock()
    } else {
      lock.unlock()
      cleanup()
    }
  }

  public func deliver(_ body: () -> Void) {
    lock.lock()
    defer { lock.unlock() }
    if active { body() }
  }

  public func cancel() {
    lock.lock()
    active = false
    let cleanup = self.cleanup
    self.cleanup = nil
    lock.unlock()
    cleanup?()
  }
}

public enum OneSDKObservations {
  // the generator emits this for an objective-c property, which has a kvc key path
  @MainActor public static func kvo<Root: NSObject, Value>(
    _ object: Root, _ path: KeyPath<Root, Value>, _ emit: @escaping (Any) -> Void
  ) throws -> OneSDKSubscription {
    guard let key = path._kvcKeyPathString else {
      throw OneSDKError.unsupported("property is not a KVO key path")
    }
    let subscription = OneSDKSubscription()
    let observation = OneSDKKeyValueObserver(object, key) { [weak subscription] in
      subscription?.deliver { emit(object[keyPath: path]) }
    }
    subscription.install { observation.invalidate() }
    return subscription
  }

  // the generator emits this for a property of an Observable class. the cast
  // checks the conformance's availability on the running system.
  @MainActor public static func tracking<Root, Value>(
    _ object: Root, _ path: KeyPath<Root, Value>, _ emit: @escaping (Any) -> Void
  ) throws -> OneSDKSubscription {
    guard object is any Observable else {
      throw OneSDKError.unsupported("object does not conform to Observation.Observable")
    }
    let subscription = OneSDKSubscription()
    let tracking = OneSDKTracking(subscription, { object[keyPath: path] }, emit)
    tracking.track()
    subscription.install { withExtendedLifetime(tracking) {} }
    return subscription
  }

  public static func publisher<P: Publisher>(
    _ publisher: P, _ emit: @escaping (Any) -> Void, _ fail: @escaping (Error) -> Void
  ) -> OneSDKSubscription {
    let subscription = OneSDKSubscription()
    let cancellable = publisher.sink(receiveCompletion: { [weak subscription] completion in
      if case .failure(let error) = completion { subscription?.deliver { fail(error) } }
    }, receiveValue: { [weak subscription] value in
      subscription?.deliver { emit(value) }
    })
    subscription.install { cancellable.cancel() }
    return subscription
  }
}

// one iterator per handle, with a latest-value snapshot for remounts. removing
// a listener gates delivery immediately; releasing the handle cancels iteration.
private final class OneSDKSequenceObservation: @unchecked Sendable {
  private let lock = NSRecursiveLock()
  private final class Listener {
    weak var subscription: OneSDKSubscription?
    let emit: (Any) -> Void
    let fail: (Error) -> Void
    init(_ subscription: OneSDKSubscription, _ emit: @escaping (Any) -> Void, _ fail: @escaping (Error) -> Void) {
      self.subscription = subscription
      self.emit = emit
      self.fail = fail
    }
  }
  private var listeners: [UUID: Listener] = [:]
  private var latest: Result<Any, Error>?
  private var task: Task<Void, Never>?

  init<S: AsyncSequence>(_ sequence: S) {
    task = Task { [weak self] in
      do {
        for try await value in sequence {
          try Task.checkCancellation()
          self?.publish(.success(value))
        }
      } catch is CancellationError {
      } catch { self?.publish(.failure(error)) }
    }
  }

  deinit { task?.cancel() }

  func subscribe(_ emit: @escaping (Any) -> Void, _ fail: @escaping (Error) -> Void) -> OneSDKSubscription {
    let id = UUID()
    let subscription = OneSDKSubscription()
    lock.lock()
    let listener = Listener(subscription, emit, fail)
    listeners[id] = listener
    if let latest { deliver(latest, to: listener) }
    lock.unlock()
    subscription.install { [weak self] in self?.remove(id) }
    return subscription
  }

  private func remove(_ id: UUID) {
    lock.lock()
    listeners[id] = nil
    lock.unlock()
  }

  private func deliver(_ value: Result<Any, Error>, to listener: Listener) {
    listener.subscription?.deliver {
      switch value {
      case .success(let value): listener.emit(value)
      case .failure(let error): listener.fail(error)
      }
    }
  }

  private func publish(_ value: Result<Any, Error>) {
    lock.lock()
    defer { lock.unlock() }
    latest = value
    for listener in Array(listeners.values) { deliver(value, to: listener) }
  }
}

private final class OneSDKKeyValueObserver: NSObject {
  let object: NSObject
  let key: String
  let changed: () -> Void
  private var active = true

  init(_ object: NSObject, _ key: String, _ changed: @escaping () -> Void) {
    self.object = object
    self.key = key
    self.changed = changed
    super.init()
    object.addObserver(self, forKeyPath: key, options: [.initial, .new], context: nil)
  }

  func invalidate() {
    if active {
      active = false
      object.removeObserver(self, forKeyPath: key)
    }
  }

  override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey: Any]?, context: UnsafeMutableRawPointer?) {
    changed()
  }
}

// the subscription owns this state; observation invalidations hold it weakly.
// queue the read because Observation fires before a mutation completes.
@MainActor private final class OneSDKTracking {
  weak var subscription: OneSDKSubscription?
  let read: () -> Any
  let emit: (Any) -> Void

  init(_ subscription: OneSDKSubscription, _ read: @escaping () -> Any, _ emit: @escaping (Any) -> Void) {
    self.subscription = subscription
    self.read = read
    self.emit = emit
  }

  func track() {
    subscription?.deliver {
      let value = withObservationTracking(read) { [weak self] in
        DispatchQueue.main.async { self?.track() }
      }
      emit(value)
    }
  }
}
