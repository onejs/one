# ImageManipulator native typecheck

This SwiftPM harness compiles the production `HybridOneImageManipulator.swift`
and `OneNativeError.swift` through source symlinks against the iOS simulator
SDK. Only Nitro transport, generated value types, and the WebP coder are
stand-ins. The class uses UIKit, so unlike the FileSystem harness nothing here
runs on macOS: there is no test target, only a simulator-triple build.

```sh
swift build --triple arm64-apple-ios17.0-simulator \
  --sdk $(xcrun --sdk iphonesimulator --show-sdk-path) \
  --package-path packages/one/ios/Tests/ImageManipulator
```

The real `SDWebImageWebPCoder` call shape (`shared`, `.webP`,
`.encodeCompressionQuality`) was read off the vendored 0.15.0 pod headers, not
the stub; Xcode 27 imports the header's `sharedCoder` class property as
`shared`. The stub only proves the production file is internally consistent.
Real WebP bytes, flip pixels, and validation codes are proven by the
native-features `image-manipulator` fixture on the iOS 27 simulator and
Android 37 emulator; this harness does not prove transport, sandbox behavior,
or a device pass.
