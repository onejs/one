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
    get { flag("sendShouldFail") }
    set { setFlag("sendShouldFail", newValue) }
  }

  static var destinationsShouldFail: Bool {
    get { flag("destinationsShouldFail") }
    set { setFlag("destinationsShouldFail", newValue) }
  }

  private static func defaults() -> UserDefaults? {
    UserDefaults(suiteName: harnessAppGroupIdentifier)
  }

  private static func flag(_ key: String) -> Bool {
    defaults()?.bool(forKey: key) ?? false
  }

  private static func setFlag(_ key: String, _ value: Bool) {
    defaults()?.set(value, forKey: key)
  }
}

