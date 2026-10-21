# one-macos

Native macOS host for One. Only Mac apps install this package; it holds every
Mac native byte so iOS, Android and web gain nothing. See
`plans/one-macos-native.md` at the repo root.

- `cpp/`: the macOS text layout manager and C++ glue for the React Native core
- `macos/`: the AppKit mounting layer, SwiftUI hosting and TurboModules
- `src/`: JS overrides resolved only for `platform=macos`
- `template/macos/`: the generated Mac app project
