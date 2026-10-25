# DOM native integration

These Swift files compile in the One pod with the Updates launcher and React Native integration. Keep them together under `ios/DOM`; `One.podspec` includes this directory through its recursive source glob.

The standalone SwiftUI generator compiles the top-level `ios/*.swift` files, generated bindings and SDK runtime with all feature groups and with none. DOM hosting needs the app integration and belongs outside that standalone source set. Its Fabric wrapper remains `ios/OneDOMHostComponentView.{h,mm}` and reaches the same Swift classes through `One-Swift.h`.
