// swift-tools-version: 6.2
import PackageDescription

let package = Package(
  name: "native-source",
  targets: [
    .executableTarget(
      name: "NativeSource",
      path: ".",
      swiftSettings: [.swiftLanguageMode(.v6)]
    ),
  ]
)
