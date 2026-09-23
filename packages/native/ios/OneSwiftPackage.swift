import SwiftUI

// the device side of `import Badge from './Badge.swift'` in a react native app.
// the same file the browser simulator compiles to wasm compiles natively here,
// unchanged: `@main struct Badge: RNXPackage` builds in its own module, which
// imports this one implicitly and renames its entry point to
// `<package>_main`. the package's generated +load hands that entry to
// OneSwiftRegisterPackage, and the first host that asks for the package runs
// it, so `main()` below files the package's view under its name.

public enum JSON {
  case string(String)
  case number(Double)
  case bool(Bool)
  case null
  case array([JSON])
  case object([(String, JSON)])

  public subscript(key: String) -> JSON? {
    guard case .object(let fields) = self else { return nil }
    return fields.last(where: { $0.0 == key })?.1
  }

  public var stringValue: String? {
    if case .string(let value) = self { return value }
    return nil
  }

  public var doubleValue: Double? {
    if case .number(let value) = self { return value }
    return nil
  }

  public var boolValue: Bool? {
    if case .bool(let value) = self { return value }
    return nil
  }

  init(parsing text: String) {
    guard let data = text.data(using: .utf8),
      let value = try? JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
    else {
      self = .null
      return
    }
    self.init(foundation: value)
  }

  private init(foundation value: Any) {
    switch value {
    case let string as String: self = .string(string)
    case let number as NSNumber:
      self =
        CFGetTypeID(number) == CFBooleanGetTypeID()
        ? .bool(number.boolValue) : .number(number.doubleValue)
    case let array as [Any]: self = .array(array.map { JSON(foundation: $0) })
    case let object as [String: Any]:
      self = .object(object.map { ($0.key, JSON(foundation: $0.value)) })
    default: self = .null
    }
  }
}

public protocol RNXPackage {
  associatedtype Content: View
  init()
  func view(props: JSON) -> Content
}

extension RNXPackage {
  @MainActor public static func main() {
    OneSwiftPackages.pending = { AnyView(Self().view(props: $0)) }
  }
}

// a whole swift app (`@main struct X: App`) mounts as the view its scene
// shows. this main outranks SwiftUI's App.main because the constrained
// extension is more specific, and every App is Sendable (App is @MainActor),
// so the app's @main files its root here instead of starting UIApplicationMain.
extension App where Self: Sendable {
  @MainActor public static func main() {
    let root = sceneRoot(Self().body)
    OneSwiftPackages.pending = { _ in root ?? AnyView(Text("\(Self.self): no view in its scene").foregroundStyle(.red)) }
  }
}

// the view a scene shows: scene modifiers wrap the WindowGroup, so a
// depth-first walk reaches it, and the group keeps its view builder as
// `content.lazy: () -> Content` (RAN on iOS 27). the extension on the public
// WindowGroup<Content> knows Content, so that closure casts statically.
private protocol SceneRoot {
  @MainActor var rootView: AnyView? { get }
}

extension WindowGroup: SceneRoot {
  @MainActor var rootView: AnyView? {
    for field in Mirror(reflecting: self).children where field.label == "content" {
      for inner in Mirror(reflecting: field.value).children {
        if let build = inner.value as? () -> Content { return AnyView(build()) }
      }
    }
    return nil
  }
}

@MainActor private func sceneRoot(_ value: Any) -> AnyView? {
  if let group = value as? any SceneRoot { return group.rootView }
  for child in Mirror(reflecting: value).children {
    if let root = sceneRoot(child.value) { return root }
  }
  return nil
}

public typealias OneSwiftPackageEntry =
  @convention(c) (Int32, UnsafeMutablePointer<UnsafeMutablePointer<CChar>?>?) -> Int32

enum OneSwiftPackages {
  nonisolated(unsafe) static var entries: [String: OneSwiftPackageEntry] = [:]
  @MainActor static var pending: ((JSON) -> AnyView)?
  @MainActor static var views: [String: (JSON) -> AnyView] = [:]

  @MainActor static func view(_ name: String) -> ((JSON) -> AnyView)? {
    if let view = views[name] { return view }
    guard let entry = entries[name] else { return nil }
    pending = nil
    _ = entry(0, nil)
    views[name] = pending
    return pending
  }
}

// called from each package's generated +load, before main
@_cdecl("OneSwiftRegisterPackage")
public func oneSwiftRegisterPackage(_ name: UnsafePointer<CChar>, _ entry: OneSwiftPackageEntry) {
  OneSwiftPackages.entries[String(cString: name)] = entry
}

