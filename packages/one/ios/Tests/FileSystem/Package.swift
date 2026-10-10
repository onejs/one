// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "OneFileSystemHarness",
  platforms: [.macOS(.v13)],
  targets: [
    .target(name: "NitroModules"),
    .target(name: "OneFileSystemCore", dependencies: ["NitroModules"]),
    .testTarget(name: "OneFileSystemTests", dependencies: ["OneFileSystemCore", "NitroModules"]),
  ]
)
