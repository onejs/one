// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "OneMenuPreviewHarness",
  platforms: [.macOS(.v13)],
  targets: [
    .target(name: "OneMenuPreviewSession"),
    .testTarget(name: "OneMenuPreviewTests", dependencies: ["OneMenuPreviewSession"]),
  ]
)
