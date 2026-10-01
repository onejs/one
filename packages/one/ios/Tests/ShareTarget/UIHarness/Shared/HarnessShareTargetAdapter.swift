// Generated-style adapter stub for the standalone UI harness. Demonstrates
// what real generated code provides: destinations() and send(), backed here
// by fixtures and an app-group flag file instead of a real transport, so the
// compose controller can be driven through success and failure paths while
// the main app process is not running (true of any Share extension launch).
//
// This file is compiled into BOTH the host app (which only needs
// HarnessControl to set the flags before presenting the share sheet) and the
// extension (which needs the full adapter); OneShareTargetAdapter and its
// model types are only visible in the extension build, so the adapter
// conformance itself lives in HarnessShareTargetAdapterExtensionOnly.swift.
import Foundation

let harnessAppGroupIdentifier = "group.dev.one.sharetargetharness"

enum HarnessControl {
  /// Written by the host app before presenting the share sheet, read by the
  /// extension process (a separate process; this is the only channel
  /// between them) to choose which path `send()`/`destinations()` take.
  static var sendShouldFail: Bool {
    get { controlledFlag("sendShouldFail") }
    set { setFlag("sendShouldFail", newValue) }
  }

  static var destinationsShouldFail: Bool {
    get { controlledFlag("destinationsShouldFail") }
    set { setFlag("destinationsShouldFail", newValue) }
  }

  private static func defaults() -> UserDefaults? {
    UserDefaults(suiteName: harnessAppGroupIdentifier)
  }

  private static func setFlag(_ key: String, _ value: Bool) {
    let file = directory.appendingPathComponent("controls.json")
    var values = (try? Data(contentsOf: file)).flatMap { try? JSONDecoder().decode([String: Bool].self, from: $0) } ?? [:]
    values[key] = value
    do { try JSONEncoder().encode(values).write(to: file, options: .atomic) }
    catch { preconditionFailure("Harness control write failed: \(error)") }
  }
}


/// Cross-process controls and receipts live only in the disposable harness
/// app group. File-system events release phase gates; no polling or credentials.
extension HarnessControl {
  static var directory: URL {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: harnessAppGroupIdentifier)!
  }
  static func controlledFlag(_ key: String) -> Bool {
    if let data = try? Data(contentsOf: directory.appendingPathComponent("controls.json")),
       let values = try? JSONDecoder().decode([String: Bool].self, from: data),
       let value = values[key] { return value }
    return defaults()?.bool(forKey: key) ?? false
  }
  static func record(_ phase: String, data: Data = Data()) throws {
    try data.write(to: directory.appendingPathComponent(phase + ".receipt"), options: .atomic)
  }
  static func waitIfHeld(_ phase: String) async throws {
    try record(phase + "-entered")
    let gate = HarnessFileGate(key: "hold" + phase.prefix(1).uppercased() + phase.dropFirst())
    await gate.wait()
  }
}

private final class HarnessFileGate: @unchecked Sendable {
  private let key: String
  init(key: String) { self.key = key }
  func wait() async {
    await withCheckedContinuation { continuation in
      let descriptor = open(HarnessControl.directory.path, O_EVTONLY)
      precondition(descriptor >= 0)
      let source = DispatchSource.makeFileSystemObjectSource(fileDescriptor: descriptor, eventMask: .write, queue: .global())
      source.setCancelHandler { close(descriptor); continuation.resume() }
      source.setEventHandler {
        if !HarnessControl.controlledFlag(self.key) { source.cancel() }
      }
      source.resume()
      if !HarnessControl.controlledFlag(key) { source.cancel() }
    }
  }
}
