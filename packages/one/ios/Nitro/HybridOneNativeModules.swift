import Foundation
import NitroModules

@MainActor private enum OneNativeSources {
  static var instances: [String: any OneNativeSourceDispatch] = [:]

  static func call(
    module: String, method: String, argsJson: String, contractHash: String
  ) async throws -> String {
    guard let package = module.split(separator: ".", maxSplits: 1).first,
      module.contains("."), !package.isEmpty
    else {
      throw oneNativeError("E_NATIVE_SOURCE", "invalid module \(module)")
    }
    let packageName = String(package)
    let dispatcher: any OneNativeSourceDispatch
    if let current = instances[packageName] {
      dispatcher = current
    } else {
      guard let type = NSClassFromString("OneNativeSource_\(packageName)") as? OneNativeSourceDispatch.Type else {
        throw oneNativeError("E_NATIVE_SOURCE", "native module \(module) is not linked; rebuild the app")
      }
      dispatcher = type.init()
      instances[packageName] = dispatcher
    }
    guard dispatcher.contractHash == contractHash else {
      throw oneNativeError("E_NATIVE_SOURCE_REBUILD", "native module \(module) changed; rebuild the app")
    }
    do {
      return try await dispatcher.call(module, method, argsJson)
    } catch {
      throw oneNativeError("E_NATIVE_SOURCE", "\(module).\(method): \(error.localizedDescription)")
    }
  }
}

final class HybridOneNativeModules: HybridOneNativeModulesSpec {
  func call(module: String, method: String, argsJson: String, contractHash: String) throws -> Promise<String> {
    return Promise.async { @MainActor in
      try await OneNativeSources.call(
        module: module, method: method, argsJson: argsJson, contractHash: contractHash)
    }
  }
}
