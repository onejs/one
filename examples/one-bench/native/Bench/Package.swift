// swift-tools-version: 6.2
import PackageDescription
let package = Package(
  name: "Bench",
  platforms: [.iOS(.v17)],
  targets: [.executableTarget(name: "Bench", path: ".", swiftSettings: [.swiftLanguageMode(.v6)])]
)
