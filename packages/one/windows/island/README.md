# Window island prototype

Tests whether a WinUI control can live in a child content island inside a
Windows App SDK composition window, with React driving it through One's Hermes
and Fabric runtime. Each mounted view is a composition visual in one
`ContentIsland`. A `OneWindowsToggle` is a `ToggleSwitch` in a `XamlIsland`,
connected to the parent island through a `ChildSiteLink` whose placement
visual sits where React laid the toggle out. XAML loads only when the first
toggle mounts. There is no `DesktopWindowXamlSource`, no child HWND per
control and no XAML tree for the other views.

- `runtime` builds `OneWindowsIslandRuntime.dll` with clang-cl, on the M0 core
  and the shared `OneHostRuntime`: the bundle, the scheduler, the toggle
  component, and each mounting transaction flattened into plain structs.
- `host` is the MSVC and C++/WinRT executable, built against Windows App SDK
  2.5.1, self contained and unpackaged. It owns the window, the visuals, the
  islands, input and focus, and writes every step to a trace file.
- `app` is real React 19.3 and React Native 0.88 from the repo's installed
  packages. Metro bundles it for the `ios` platform because One has no
  Windows platform resolution, so `Platform.OS` reads `ios`. The toggle is
  controlled the way the Mac and Linux controls are: input arrives as
  `onIsOnChange`, React takes it into state, and `acknowledgedEvent` tells
  the native switch that React has caught up.
- `drive.ps1` drives the real window with `SendInput` and checks the trace
  after each step, capturing the window at the screen's density.
- `scripts/build-core.ps1 -Phase island -Bundle <island.js>` builds it after
  the core and Hermes phases, and `.github/workflows/windows-island.yml` runs
  it all on the `windows-2025` runner.

## Result

Run 40140133384 on source 26a4bfd591 passed all 48 checks on a 1024x768,
96 dpi runner screen, so the screenshots are 1x. It ran React 19.3.0, React
Native 0.88.0, Metro 0.87.1, Hermes 260318099.0.4, Windows App SDK 2.5.1
(WinUI 2.3.9, `Microsoft.UI.Xaml.dll` 3.2.3.2609) and native-core d35f3f285dde.

- A click on the switch's track toggles the native switch. React gets the
  event, and the next Fabric transaction mounts React's label, a new square
  and the bar's color. The acknowledgement comes back 2 to 4 ms after the
  input.
- Pointer focus on the switch reaches React, which colors the frame. Tab
  past the switch, its island's only stop, raises `DepartFocusRequested`, the
  parent island takes focus and React sees the blur. Space then reaches the
  parent and leaves the switch alone. Tab on the parent calls
  `NavigateFocus(First)` on the link's `InputFocusNavigationHost`, and the
  switch gets keyboard focus with its focus visual. Space on it toggles it.
- Resizing the window lays the surface out again in one transaction, moves
  the link with the toggle's new frame, and the next click lands on the
  moved switch.
- React unmounts the switch, which closes its island, then mounts a new one
  in a new island with React's current state, and the new switch takes input.
- Closing the window stops the surface. The empty tree removes all ten views
  and closes the island before the runtime goes, and the host exits 0.

Findings:

- `SurfaceHandler::stop` commits the empty tree synchronously, then destroys
  the shadow tree, whose destructor revokes the mounting coordinator. A pull
  posted to the UI thread for that commit finds nothing, which left the
  island open. The runtime mounts a commit made on the UI thread
  synchronously, as iOS's mounting manager does.
- `Microsoft.UI.Content.ContentPreTranslateMessage` is not in the 2.5.1
  metadata. The host runs `DispatcherQueue.RunEventLoop`, which handles
  keyboard input for islands without it.
- The bundle needs no TurboModule beyond the shared host's set to start and
  run this app.
- When React remounts the switch under a pointer that rests on it, the new
  island takes pointer focus before any click.
