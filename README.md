# One Windows host probe

Disposable measurement branch. It is never merged. It answers one architecture
question for a native Windows One host on the unforked React Native core: does a
WinUI 3 XAML element per mounted view cost meaningfully more than a lifted
Composition visual per view (the react-native-windows Fabric model)?

`windows-probe/main.cpp` mounts a synthetic Fabric-shaped tree (branching 4)
either as XAML `Canvas` elements (`xaml`), decorated XAML `Grid` elements with
border and corner radius (`xaml-grid`), or `SpriteVisual`s in a `ContentIsland`
on a `DesktopChildSiteBridge` (`comp`). It reports, from kernel process
creation: shell launch, window shown, mount time, first rendered frame, the next
DWM composition, relayout-to-frame for 20 updates, private bytes per node, and
the modules each mode actually loads. The workflow runs on a GitHub-hosted
`windows-2025` runner, so absolute times are a shared VM without a GPU.
