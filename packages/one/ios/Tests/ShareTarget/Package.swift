// swift-tools-version:6.0
// Standalone harness for the One iOS ShareTarget sources. Builds the
// non-UIKit logic (adapter contract, intake, draft store) as a real SwiftPM
// target against the actual files in ../ShareTarget -- no copies -- and
// runs it. This is independent of any Xcode project/Podspec integration,
// which belongs to the parent task that wires generated code into an app.
//
// The UIKit-dependent compose controller (OneShareComposeViewController.swift,
// OneShareTargetViewController.swift) cannot run here: SwiftPM test runs on
// the host macOS toolchain, which has no UIKit. That file is validated
// separately by a direct `swiftc -sdk iphonesimulator -application-extension`
// compile (see evidence.md); this package is "foundation-model" is not
// involved, it is plain Swift + Foundation.
import PackageDescription

let package = Package(
  name: "OneShareTargetHarness",
  platforms: [.macOS(.v14)],
  targets: [
    .target(
      name: "OneShareTargetCore",
      // Sources/OneShareTargetCore/*.swift are symlinks into ../../../ShareTarget
      // (the real, single-source-of-truth files) -- not copies. The two
      // UIKit-dependent files are intentionally not symlinked here; see the
      // package-level doc comment above.
      swiftSettings: [.swiftLanguageMode(.v6)]
    ),
    .testTarget(
      name: "OneShareTargetHarnessTests",
      dependencies: ["OneShareTargetCore"],
      swiftSettings: [.swiftLanguageMode(.v6)]
    ),
  ]
)
