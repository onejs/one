# One on native Linux

Experiment lane, owned by s72425 until it hands to a successor. It mirrors
[one-macos-native.md](one-macos-native.md): the same unforked React Native C++
core, an owned host on the platform's own toolkit, and every Linux byte in one
directory of the default `one` install.

## Direction

The owner's 2026-10-24 direction is recorded in the private Contrast spec
`specs/one-linux-native.md`: start a native Linux target that mirrors the
macOS plan, after the Mac and iOS startup work reaches a great spot. The Mac
direction's rules carry over unchanged: build anything the platform's own
tools can, follow One V2 patterns, support platform extensions, and add no
released-binary or install bloat to other platforms.

## Decisions

### 1. Host runtime: an owned GTK 4 host on unforked React Native C++

- **Compiled from the installed `react-native`:** the same `RN_DIRS` list the
  Mac core builds in `packages/one/macos/cpp/CMakeLists.txt` (jsi, Fabric
  renderer, scheduler, runtime scheduler, Yoga, bridgeless `react/runtime`,
  C++ TurboModule core). Those units already build with CMake for the Mac, so
  the Linux build shares that list instead of copying it: the list moves to a
  CMake include both platforms read.
- **Third-party native dependencies:** folly, glog, fmt, boost and
  double-conversion have no Linux prebuilt. Build them from the sources RN's
  Android build pins (`ReactAndroid` third-party CMake lists and the versions
  in its gradle properties), cached per RN version in the user cache.
- **JS engine:** Hermes from source for Linux, the same pinned revision the
  Mac build uses. worklets needs Hermes, as on the Mac.
- **Authored by us:** the mounting layer (surface root widget, main-thread
  mutation applier, component view registry, a base view for frame, color,
  border, opacity and clipping), text layout and measurement on Pango with
  the iOS `TextLayoutManager` contract, input from GTK event controllers into
  Fabric event emitters, the event beat on the GLib main loop (the
  counterpart of the Mac `MainRunLoopObserver`), and the same minimal
  TurboModule set the Mac host boots with. Host code that is plain C++ in the
  Mac host (instance setup, TurboModule context, timers) moves to a shared
  directory both hosts compile, so it is written once.
- **App shell:** a `GtkApplication` with one `GtkApplicationWindow` whose
  child is the surface root. Menus are `GMenu` actions, the counterpart of
  the Mac app commands.
- **Native controls:** GTK 4 widgets (and libadwaita where GNOME's HIG
  defines the control) through the controlled protocol in
  `src/platform/controlled.ts`, the counterpart of the Mac SwiftUI controls.

GTK 4 was chosen by the owner on 2026-10-24.

Falsifier: if a `ReactCommon` unit the Mac core builds does not compile on
Linux with GCC 13 or Clang 18 without editing RN source, record the unit and
the patch here.

### 2. Packaging: Linux ships inside the default `one` install

The Mac packaging rules apply with `linux` for `macos`:

- Every Linux byte lives under `packages/one/linux/` (`host/`, `cpp/`,
  `template/`, `react-native/`), outside every iOS, Android and macOS glob.
  `one`'s `files` gains `"linux"`.
- Linux native code is compiled only by the Linux app's own build.
  Hermes and the third-party dependencies build or download into the user
  cache on first build; none of them ship in the npm package.
- The size gates in the Mac plan are rechecked for Linux: iOS, Android, web
  and macOS release bundles change by 0 bytes except the platform-set
  constants that must name `linux`.

### 3. JS platform `linux` in vxrn and One

- `linux` joins the shared `NativePlatform` type the Mac work introduced
  (`ios | android | macos`), with its own Vite native environment, dev bundle
  at `/index.bundle?platform=linux` and HMR socket.
- Resolution order: `.linux.*`, `.native.*`, then the plain file.
- Inside `react-native` itself, `linux` resolves to the same files the Mac
  resolves (`.ios.js`), because the host implements the iOS-shaped native
  module contract; importers outside `react-native` get an owned `Platform`
  override where `Platform.OS` is `'linux'`.
- `One.platform` gains `'linux'`; `One.linux` is the Linux component namespace.

### 4. Startup from the first milestone

The Mac startup work showed that a release app must embed its bundle as
Hermes bytecode and map it from disk (Mac, 2026-10-23: 624 ms to main content
from served plain JS, 185 ms from embedded bytecode). The Linux host starts that way
from M1 in release builds, and its startup is measured at every milestone
from process start to the first frame with main content, on the same app.
Target: main content within 250 ms on a current desktop.

## Milestones

**M1, a real window.** A Linux build of `tests/macos-basic`'s app (renamed
once it serves both) opens a GTK window that mounts `app/index.tsx`,
rendering `View`, `Text` and one GTK control whose value round-trips to React
state, from the dev server with Fast Refresh and from an embedded bytecode
bundle in release. Proof: a screenshot of each, the startup timeline, and the
size gates.

**M2, interaction.** Pointer press and hover, scrolling on
`GtkScrolledWindow`, `TextInput` on `GtkText`, keyboard focus and tab order,
cursor, accessibility through GTK's AT-SPI support, dark mode, resize.

**M3, controls.** The first ten Linux controls and composition with React
Native content inside a scroll view.

**M4, app shell and routing.** One `Stack` and `Tabs`, a sidebar, menus and
actions, header bar, multiple windows.

**M5, release.** Prebuilt core per RN version to cut build time, a Flatpak
and a `.deb`, a canary.

## Where it runs

Development and proof run in a Linux arm64 VM on a fleet Mac (`limactl` is
installed on studio-64), headless under a Wayland compositor for screenshots,
and on the Linux CI host for x86_64 builds. Timing claims name the machine.

## Status

M0: this plan.

**Core slice (toolkit neutral), 2026-10-23.** The Linux build of the RN C++ core
is done and runs headless. Machine: studio-64, Lima 2.2 VM (Ubuntu 24.04
arm64, vz), 8 CPUs, 16 GB, clang 18 with libstdc++, `react-native` 0.88.0.

- **Shared list:** `RN_DIRS` and the source collection moved to
  `packages/one/native-core/rn-core.cmake`. The Mac configure produces the
  same 433 file source list as before; the Mac app was not rebuilt.
- **Compiled unchanged:** every `ReactCommon` unit the Mac core builds
  (316 build steps, including Fabric, scheduler, runtime scheduler, Yoga,
  bridgeless `react/runtime`, the C++ TurboModule core and the Hermes
  inspector glue), with no edit to react-native source. The cxx platform
  backends react-native ships (`TextLayoutManager.cpp` stub, `ImageManager.cpp`,
  graphics, view, scrollview, text and utils headers) stand in for the
  Apple ones.
- **Hermes:** built from source at the Mac's revision (`hermes-v260318099.0.4`,
  `hermesvm` plus `hermesc`, jsi from react-native). 1m44s.
- **Third party:** boost 1_83_0 (headers only), double-conversion 1.1.6,
  fast_float 8.0.0, fmt 12.1.0, folly 2024.11.18.00 and glog 0.3.5, at the
  versions in react-native's `gradle/libs.versions.toml`, built with
  react-native's own Android third-party CMake files. 4 s after the downloads.
- **Core:** 1m01s with 8 jobs (6m21s of CPU), a 250 MB debug static library.
- **Smoke:** `one-linux-smoke` creates a `ReactInstance` on Hermes, builds a
  `Scheduler` with 8 component descriptors, evaluates a `hermesc` bytecode file
  and prints `smokeDone(42)`. It exits 0 in 31 ms.

Workarounds, none in react-native source (the falsifier did not trip):

1. libstdc++ does not include `<cstdint>` transitively as libc++ does, and
   `HttpUtils.h`, `NetworkTypes.h` and `AnsiParser.h` use `uint8_t` and
   `uint16_t` without it. The core compiles with `-include cstdint`.
2. react-native's third-party CMake files get `-Wall -Werror` from
   `react-native-flags.cmake`, which fails on compilers it does not test. The
   deps build supplies its own copy of that file without those two flags.
3. boost is headers only. react-native's boost CMake file only adds Android
   ABI assembly, so it is skipped.
4. `NativeIdleCallbacks.h` includes `FBReactNativeSpec/FBReactNativeSpecJSI.h`
   from the iOS pod layout, so `React/FBReactNativeSpec` is an include
   directory, as on the Mac.

Reproduce: `packages/one/linux/scripts/lima-vm.sh` creates the VM, then
`RN_ROOT=<node_modules/react-native> packages/one/linux/scripts/build-core.sh`
builds everything into `~/.cache/ReactNative/linux`.

**M1 window, 2026-10-23.** A GTK 4 window mounts a React Native app from
embedded Hermes bytecode. Machine: studio-64, Lima VM as above, headless sway
(pixman) and grim for the screenshot. Proof:
[one-linux-native-m1.png](one-linux-native-m1.png), a release build showing
nested views with colors, borders and radii, and Pango text (wrapping, fixed
line height, italic, underline, letter spacing, uppercase).

- **Shared host:** the plain C++ Mac host runtime (message queue thread,
  timers, run loop observer, TurboModule context) moved to
  `packages/one/native-core/host/`; both hosts compile it. The Mac app was not
  rebuilt.
- **Linux host** (`packages/one/linux/host/`): `OneView` is a GtkWidget
  subclass (measure, size_allocate, snapshot with rounded clip, background,
  border, Pango layout). `OneLinuxMountingManager` applies `ShadowViewMutation`
  transactions on the GLib main loop. The event beat is a GSource whose prepare
  step is the before waiting observer. `main.cpp` is a `GtkApplication` with an
  800x600 window.
- **Text:** `TextLayoutManager` on Pango replaces the cxx stub, with absolute
  pixel sizes and hinting off, so measurement and painting share one layout.
- **Startup, process start to first frame with content, ms** (kernel process
  start, `ONE_LINUX_STARTUP_LOG=1`):

  | build | runs | first frame |
  | --- | --- | --- |
  | release, bytecode | 126.0, 126.5, 127.0, 127.9, 130.6 | about 127 |
  | debug, bytecode | 170.1, 175.7, 187.2 | about 175 |

  Release timeline of one run: main 11, gtk activate 22, runtime ready 96,
  first transaction mounted 103, first frame painted 128. The first cold run
  after VM boot was about 650 ms (page cache). Target was 250 ms.
- **Build times:** debug core incremental about 1 minute. Release full build
  (third party, Hermes, core, host) 2m02s through `tm window run heavy`.

Workarounds and gaps:

1. The app is bundled for platform `ios` (Metro on the Mac, since the VM has no
   node), because the `linux` JS platform does not exist yet. hermesc runs in
   the VM. The bytecode in the release run came from the debug hermesc; the
   format is the same, a release hermesc was not compared.
2. The VM has no GPU, so GTK uses the software path and prints GL and a11y bus
   warnings.
3. `colorScheme` is fixed to light, and the module context reports idiom
   `desktop` and the uname OS version.
4. Pango `line_height_absolute` placement is not compared against iOS centering.
5. No transforms, pointer events, images, scroll views, text input, dark mode
   or GTK controls yet.
6. The `-include cstdint` workaround from the core slice still applies.

**Next:** the `linux` JS platform in vxrn (`.linux.*` resolution, dev bundle,
HMR socket) so the app bundles without the ios platform; the dev server with
Fast Refresh; one GTK control round-tripping state through the controlled
protocol; then M2 (pointer events, scroll, text input, transforms, dark mode).
