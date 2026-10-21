# One on macOS

Native macOS host for One, shipped inside the `one` package. Every Mac native
byte lives under this directory so iOS, Android and web gain nothing. See
`plans/one-macos-native.md` at the repo root.

- `cpp/`: the macOS text layout manager and C++ glue for the React Native core
- `host/`: the AppKit mounting layer, SwiftUI hosting and TurboModules
- `react-native/`: JS overrides resolved only for `platform=macos`
- `template/macos/`: the generated Mac app project
