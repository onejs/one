import Foundation
import CoreFoundation
import CoreGraphics
import ObjectiveC

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
  public var value: Any
  public init(_ value: Any) { self.value = value }
  public var typeName: String { String(reflecting: type(of: value)) }
}

// calls the javascript function a call's arguments named {"$f": index}, with
// encoded arguments
public struct OneSDKCallbackReply {
  public let json: String
  public let handles: [OneSDKHandleBox]
  public init(json: String, handles: [OneSDKHandleBox]) { self.json = json; self.handles = handles }
}

public typealias OneSDKSyncDispatch = (_ index: Int, _ json: String, _ handles: [OneSDKHandleBox]) -> OneSDKCallbackReply

public typealias OneSDKDispatch = (_ index: Int, _ json: String, _ handles: [OneSDKHandleBox]) -> Void

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

  static func update(_ changed: [String: [Any]], on owner: NSObject) {
    guard !changed.isEmpty else { return }
    lock.lock()
    let previous = objc_getAssociatedObject(owner, &associationKey) as? OneSDKRetainedImplementations
    var slots = previous?.slots ?? [:]
    for (name, values) in changed {
      slots[name] = values.isEmpty ? nil : values
    }
    objc_setAssociatedObject(owner, &associationKey, slots.isEmpty ? nil : OneSDKRetainedImplementations(slots), .OBJC_ASSOCIATION_RETAIN_NONATOMIC)
    lock.unlock()
    // release replaced implementations outside the lock; their teardown can reenter.
    withExtendedLifetime(previous) {}
  }
}

// one invocation: the decoded arguments and the handles going back
public final class OneSDKCall {
  let values: [Any]
  let receiverValue: Any?
  let handlesIn: [OneSDKHandleBox]
  let dispatch: OneSDKDispatch?
  let syncDispatch: OneSDKSyncDispatch?
  private let argumentNames: [String]
  private var implementations: [Int: [Any]] = [:]
  private var implementationResult: NSObject?
  private let callbackThread = Thread.current
  private let callbackLock = NSLock()
  private var synchronousCallbacksActive = true
  private var callbackFailure: Error?
  public private(set) var handlesOut: [OneSDKHandleBox] = []

  public init(json: String, handles: [OneSDKHandleBox], argumentNames: [String]? = nil, syncDispatch: OneSDKSyncDispatch? = nil, dispatch: @escaping OneSDKDispatch) throws {
    let root = try JSONSerialization.jsonObject(with: Data(json.utf8), options: [.fragmentsAllowed]) as? [String: Any] ?? [:]
    if let error = root["error"] as? String { throw OneSDKError.callback(error) }
    values = root["args"] as? [Any] ?? []
    self.argumentNames = argumentNames ?? values.indices.map(String.init)
    receiverValue = root["self"]
    handlesIn = handles
    self.dispatch = dispatch
    self.syncDispatch = syncDispatch
  }

  // a fresh call for encoding callback arguments
  init(handles: [OneSDKHandleBox]) {
    values = []
    argumentNames = []
    receiverValue = nil
    handlesIn = handles
    dispatch = nil
    syncDispatch = nil
  }

  public func has(_ index: Int) -> Bool {
    index < values.count && !(values[index] is NSNull)
  }

  public func arg<T>(_ index: Int) throws -> T {
    if implementations[index] == nil { implementations[index] = [] }
    guard index < values.count else {
      if let none = OneSDKConvert.none(T.self) { return none }
      throw OneSDKError.missingArgument(index)
    }
    return try OneSDKConvert.from(values[index], as: T.self, self, index: index)
  }

  func retainImplementation(_ value: Any, index: Int) {
    implementations[index, default: []].append(value)
  }

  private func nativeObject(_ value: Any) -> NSObject? {
    if let optional = value as? OneSDKOptional { return optional.unwrapped.flatMap(nativeObject) }
    guard type(of: value) is AnyClass else { return nil }
    return value as? NSObject
  }

  public func retainImplementations() {
    let receiver = receiverValue.flatMap { handle($0) }.flatMap { nativeObject($0.value) }
    guard let owner = receiver ?? implementationResult else { return }
    var slots: [String: [Any]] = [:]
    for (index, values) in implementations where index >= 0 && index < argumentNames.count {
      slots[argumentNames[index]] = values
    }
    OneSDKRetainedImplementations.update(slots, on: owner)
    implementations.removeAll()
  }

  public func arg<T>(_ index: Int, or fallback: @autoclosure () -> T) throws -> T {
    if implementations[index] == nil { implementations[index] = [] }
    return index < values.count ? try arg(index) : fallback()
  }

  public func receiver<T>() throws -> T {
    try OneSDKConvert.from(receiverValue ?? NSNull(), as: T.self, self, index: -1)
  }

  // writes a mutated struct receiver back to the handle javascript holds
  public func setReceiver(_ value: Any) {
    if let ref = receiverValue as? [String: Any], let index = ref["$h"] as? Int, index < handlesIn.count {
      handlesIn[index].value = value
    }
  }

  public func callback(_ index: Int) throws -> OneSDKFunction {
    try callback(index >= 0 && index < values.count ? values[index] : NSNull(), index: index)
  }

  func callback(_ value: Any, index: Int) throws -> OneSDKFunction {
    guard let ref = value as? [String: Any], let at = ref["$f"] as? Int, at >= 0, let dispatch else {
      throw OneSDKError.badArgument(index: index, expected: "function", got: OneSDKConvert.describe(value))
    }
    return OneSDKFunction(sync: { [weak self] json, handles in
      guard let self else { throw OneSDKError.unsupported("synchronous callback after its call") }
      self.callbackLock.lock()
      let active = self.synchronousCallbacksActive
      self.callbackLock.unlock()
      guard active, Thread.current === self.callbackThread, let sync = self.syncDispatch else {
        throw OneSDKError.unsupported("synchronous callback outside its JS-thread call")
      }
      let reply = sync(at, json, handles)
      return try OneSDKCall(json: reply.json, handles: reply.handles, dispatch: dispatch)
    }) { json, handles in dispatch(at, json, handles) }
  }

  public func endSynchronousCallbacks() {
    callbackLock.lock()
    synchronousCallbacksActive = false
    callbackLock.unlock()
  }

  public func failCallback(_ error: Error) {
    callbackLock.lock()
    if callbackFailure == nil { callbackFailure = error }
    callbackLock.unlock()
  }

  public func checkCallbacks() throws {
    callbackLock.lock()
    let error = callbackFailure
    callbackLock.unlock()
    if let error { throw error }
  }

  public func keyPath<T>(_ index: Int, _ paths: [String: T]) throws -> T {
    guard index < values.count else { throw OneSDKError.missingArgument(index) }
    if let name = values[index] as? String {
      guard let path = paths[name] else { throw OneSDKError.badArgument(index: index, expected: paths.keys.sorted().joined(separator: " | "), got: name) }
      return path
    }
    return try arg(index)
  }

  func handle(_ ref: Any) -> OneSDKHandleBox? {
    guard let ref = ref as? [String: Any], let index = ref["$h"] as? Int, index < handlesIn.count else { return nil }
    return handlesIn[index]
  }

  public func out(_ value: Any?) -> Any {
    if implementationResult == nil, let value { implementationResult = nativeObject(value) }
    return OneSDKConvert.to(value, self)
  }

  public let void: Any = NSNull()

  // a call that writes through out parameters answers {"$ret": result, "$out": {name: value}}
  public func outs(_ value: Any?, _ written: [String: Any?]) -> Any {
    ["$ret": out(value), "$out": written.mapValues { out($0) }]
  }

  func addHandle(_ box: OneSDKHandleBox) -> Any {
    handlesOut.append(box)
    var ref: [String: Any] = ["$h": handlesOut.count - 1, "$t": box.typeName]
    if box.value is OneSDKCallable { ref["$fn"] = true }
    return ref
  }

  public func encode(_ value: Any) -> String {
    let data = (try? JSONSerialization.data(withJSONObject: value, options: [.fragmentsAllowed])) ?? Data("null".utf8)
    return String(decoding: data, as: UTF8.self)
  }
}

// a javascript function held by native code
public final class OneSDKFunction {
  let send: (_ json: String, _ handles: [OneSDKHandleBox]) -> Void
  let sync: ((_ json: String, _ handles: [OneSDKHandleBox]) throws -> OneSDKCall)?
  init(sync: ((_ json: String, _ handles: [OneSDKHandleBox]) throws -> OneSDKCall)? = nil,
       _ send: @escaping (_ json: String, _ handles: [OneSDKHandleBox]) -> Void) { self.send = send; self.sync = sync }

  public func response(_ args: [Any?]) throws -> OneSDKCall {
    guard let sync else { throw OneSDKError.unsupported("synchronous callback dispatcher is missing") }
    let call = OneSDKCall(handles: [])
    return try sync(call.encode(args.map { call.out($0) }), call.handlesOut)
  }

  public func result<T>(_ args: [Any?], as: T.Type = T.self) throws -> T {
    try response(args).arg(0)
  }

  public func callAsFunction(_ args: Any?...) {
    let call = OneSDKCall(handles: [])
    let encoded = args.map { call.out($0) }
    send(call.encode(encoded), call.handlesOut)
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

  public static func from<T>(_ value: Any, as type: T.Type, _ call: OneSDKCall, index: Int) throws -> T {
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
    if let bridged = T.self as? OneSDKBridged.Type {
      return try bridged.fromJS(value, call) as! T
    }
    if let sequence = T.self as? OneSDKSequence.Type, let items = value as? [Any] {
      return try sequence.build(items, call, index: index) as! T
    }
    if let dictionary = T.self as? OneSDKDictionary.Type, let entries = value as? [String: Any] {
      return try dictionary.build(entries, call, index: index) as! T
    }
    // `Any` and foundation-typed values pass through as json decoded them
    if let typed = value as? T { return typed }
    throw OneSDKError.badArgument(index: index, expected: String(reflecting: T.self), got: describe(value))
  }

  public static func to(_ value: Any?, _ call: OneSDKCall) -> Any {
    guard let value else { return NSNull() }
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
    guard let number = value as? NSNumber, CFGetTypeID(number) == CFBooleanGetTypeID() else { throw OneSDKError.badArgument(index: -1, expected: "boolean", got: OneSDKConvert.describe(value)) }
    return number.boolValue
  }
  public func toJS(_ call: OneSDKCall) -> Any { self }
}

public protocol OneSDKNumber: OneSDKBridged {
  init(_ double: Double)
  var double: Double { get }
}

extension OneSDKNumber {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Self {
    guard let number = value as? NSNumber, CFGetTypeID(number) != CFBooleanGetTypeID() else {
      throw OneSDKError.badArgument(index: -1, expected: "number", got: OneSDKConvert.describe(value))
    }
    return Self(number.doubleValue)
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
    guard let ref = value as? [String: Any], let ms = ref["$date"] as? Double else {
      throw OneSDKError.badArgument(index: -1, expected: "Date", got: OneSDKConvert.describe(value))
    }
    return Date(timeIntervalSince1970: ms / 1000)
  }
  public func toJS(_ call: OneSDKCall) -> Any { ["$date": timeIntervalSince1970 * 1000] }
}

extension Data: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> Data {
    guard let ref = value as? [String: Any], let text = ref["$data"] as? String, let data = Data(base64Encoded: text) else {
      throw OneSDKError.badArgument(index: -1, expected: "ArrayBuffer", got: OneSDKConvert.describe(value))
    }
    return data
  }
  public func toJS(_ call: OneSDKCall) -> Any { ["$data": base64EncodedString()] }
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
    let v = value as? [String: Double] ?? [:]
    return CGPoint(x: v["x"] ?? 0, y: v["y"] ?? 0)
  }
  public func toJS(_ call: OneSDKCall) -> Any { ["x": x, "y": y] }
}

extension CGSize: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> CGSize {
    let v = value as? [String: Double] ?? [:]
    return CGSize(width: v["width"] ?? 0, height: v["height"] ?? 0)
  }
  public func toJS(_ call: OneSDKCall) -> Any { ["width": width, "height": height] }
}

extension CGRect: OneSDKBridged {
  public static func fromJS(_ value: Any, _ call: OneSDKCall) throws -> CGRect {
    let v = value as? [String: Double] ?? [:]
    return CGRect(x: v["x"] ?? 0, y: v["y"] ?? 0, width: v["width"] ?? 0, height: v["height"] ?? 0)
  }
  public func toJS(_ call: OneSDKCall) -> Any { ["x": origin.x, "y": origin.y, "width": size.width, "height": size.height] }
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
  public func toJS(_ call: OneSDKCall) -> Any {
    Self.oneSDKConstants.first(where: { $0.1.rawValue == rawValue })?.0 ?? rawValue.toJS(call)
  }
}

// each framework's generated table, found by name so an app links only the
// frameworks it imports
public protocol OneSDKTable: NSObject {
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
