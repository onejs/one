// swift-tools-version:5.9
import PackageDescription

let package = Package(
  name: "OneImageManipulatorHarness",
  platforms: [.iOS(.v17)],
  targets: [
    .target(name: "NitroModules"),
    .target(name: "SDWebImageWebPCoder", dependencies: []),
    .target(name: "OneImageManipulatorCore", dependencies: ["NitroModules", "SDWebImageWebPCoder"]),
  ]
)
