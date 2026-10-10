# FileSystem native contract regression

This SwiftPM harness compiles the production `HybridOneFileSystem.swift` and
`OneNativeError.swift` through source symlinks. Only Nitro transport and generated
value types are stand-ins. Tests perform real Foundation file operations on macOS.

```sh
tm window run heavy -- swift test --package-path packages/one/ios/Tests/FileSystem
```

Tests cover valid padded base64 and empty files, malformed base64 rejecting before
creation or replacement, and UTF-8 write/copy/move/delete with existing-destination
rejection. Malformed inputs include interior padding, excess padding, unpadded
input, whitespace and the URL-safe alphabet.

The same invalid-write checks run in the native-features FileSystem fixture on
both platforms. The host harness proves Foundation behavior and serial promise
settlement; it does not prove real Nitro transport, app sandbox behavior, or an
iPhone/Android device pass.
