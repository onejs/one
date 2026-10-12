// swift-tools-version: 6.2
import PackageDescription

// one prebuild compiles every .swift file in this package into the iOS app.
let package = Package(
  name: "Showcase",
  platforms: [.iOS(.v17)],
  targets: [
    .executableTarget(
      name: "Showcase",
      path: ".",
      swiftSettings: [.swiftLanguageMode(.v6)]
    ),
  ]
)
