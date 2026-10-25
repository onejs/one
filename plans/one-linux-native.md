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

**Linux CI and ICU portability, 2026-10-25, one-linux-ci for s72425.**
The independent `Linux Native Build` workflow follows the Android native
workflow's checkout, shared install action with `workspace-focus: one`, path
filters, push/PR/manual triggers and concurrency policy. Its two matrix entries
build the source core and GTK host on `ubuntu-24.04` (x86_64) and
`ubuntu-24.04-arm` (aarch64). They bundle `tests/linux-basic`, compile embedded
Hermes bytecode, launch under headless Sway and require the opt-in
`first frame with RN text painted` milestone before taking a screenshot.
The jobs share no dependency or concurrency group with another platform.
Launch logs and the screenshot are uploaded even when launch fails.

INFERRED from the pinned Hermes `hermes-v260318099.0.4` source: its
[Linux compiler workflow](https://github.com/facebook/hermes/blob/hermes-v260318099.0.4/.github/workflows/build-hermesc-linux.yml)
builds React Native's prebuilt Linux `hermesc` with `HERMES_STATIC_LINK=ON`.
That option also enables `HERMES_USE_STATIC_ICU` in
[Hermes CMake](https://github.com/facebook/hermes/blob/hermes-v260318099.0.4/CMakeLists.txt).
One uses `HERMES_USE_STATIC_ICU=ON` directly, preserving the shared
`libhermesvm.so` ABI and Unicode behavior while embedding ICU instead of
requiring the build machine's ICU soname. `HERMES_UNICODE_LITE` would remove
Unicode functionality, so it is unsuitable for the app runtime. Hermes and
packaged-core cache identities now distinguish static ICU builds. Flatpak
packaging no longer copies system ICU libraries or sets a library path for them.
Both CI architectures inspect the ELF dependencies of the VM and compiler and
fail if either imports `libicu*.so`. This removes the ICU version requirement;
GTK, libc and the other system library requirements still follow the build host.
TESTED run 40184422620: both architectures compiled Hermes but could not link
the shared VM against Ubuntu's non-PIC ICU archives. One therefore builds
checksum-pinned ICU 74.2 with `-fPIC`, static libraries and embedded data in
the same user cache before configuring Hermes. This follows ICU's
[Unix source build](https://unicode-org.github.io/icu/userguide/icu4c/build.html)
and supplies the upstream static ICU option with archives suitable for a shared
VM. No system ICU development package is required.

TESTED run 40185359129: aarch64 built the entire core and host, compiled the
Linux Basic bytecode and painted RN text under headless Wayland. Its VM and
compiler ELF dependencies contain no ICU soname. x86_64 linked the PIC ICU VM
but failed when linking the core smoke binary: RN's atomic optional double
feature flags require the `libatomic` runtime on this architecture. The Linux
core now links that library for both consumers. The headless capture also
selects GTK's Cairo renderer to avoid hardware renderer discovery on runners
without a GPU.

TESTED [run 40186988728](https://github.com/onejs/one/actions/runs/40186988728)
at `000dc373b564824948e82c403a0a47985a40bdb2`: both x86_64 and aarch64
passed the full source core/GTK host build, VM and compiler ELF dependency
checks, Linux Basic bytecode build and first RN text paint. Inspected both
uploaded screenshots: each shows the routed Home page, GTK tabs, RN text,
buttons and the input. Both `libhermesvm.so` and `hermesc` import only standard
C/C++ runtime libraries, with no dynamic ICU dependency. The job's startup
timeline is launch evidence on shared CI runners, not a desktop performance
benchmark. No additional automated tests were added. No package, canary or
release was published, and the changed .deb/Flatpak packaging has not been
rebuilt in this lane. Lead s72425 owns landing into the held minor branch;
ci-manager owns broader platform and delivery checks.

**Review 3 fixes, 2026-10-24, one-linux-m5.** RAN a release host build and
`tests/linux-basic` bundle with a temporary probe page in the arm64 VM under
headless sway and a uinput pointer and keyboard, with fatal GTK criticals
(fatal warnings for the resize run).

- P2 1 and 2, navigation insets: the native view now measures its header and
  sidebar and sends them through Fabric state in the same synchronous commit as
  control sizes. The shadow node turns them into Yoga border (top and left) and
  the pages fill what is left, so `onContentLayout` and its JS round trip are
  gone. TESTED the routed page: measure `pageY 67` for a view laid out at
  `y 20`, and a click 31 px into it reports `pageY 98`, `locationY 31`, so
  measure and press agree ([origin](one-linux-native-review3-origin.webp)). The
  first mounted frame already holds the page: first mounted frame 202.8 ms,
  first frame with RN text 221.7 ms on a cold start under load.
- P2 3, synchronous mounting: the commit mounts inline only while the host is
  flushing control measurements on the main thread; other commits queue.
  Drag-resize was driven by changing the sway output size six times under fatal
  warnings with controls on the page: no warning, no crash. The unfixed build
  was not run, so whether it reproduced is INFERRED from reading only.
- P2 4, DropDown selection: `OneLinuxControl::update` reports whether a prop
  that can change the natural size changed. TESTED a DropDown with "A" and "A
  much longer choice here": selecting the second item grows the control and the
  full label stays visible ([long](one-linux-native-review3-dropdown-long.webp)).
- P2 5, worklet frames: each worklets module owns its `AnimationFrames`.
  TESTED two windows each running a worklet `requestAnimationFrame` loop
  ([two windows](one-linux-native-review3-two-windows.webp)); closing one left
  the other counting (670 then 790 frames two seconds apart,
  [after close](one-linux-native-review3-window-closed.webp)).
- P2 6, bindings: matching uses `gdk_key_event_matches` plus the key's base
  symbol, so `cmd-shift-[` and `ctrl-+` fire (and `cmd-k`)
  ([keys](one-linux-native-review3-shifted-keys.webp)). `cmd` means Ctrl on
  Linux, GTK's primary accelerator. A binding named `ctrl-k` and one named
  `cmd-k` therefore collide on Linux. This choice is s72425's to confirm.
- P3 7, lazy tabs: tabs render once focused unless `lazy: false`, and page
  titles use `tabBarLabel`, then `title`, then the route name. Not exercised
  in the VM.
- P3 8, stale props key: the mounting record keeps the last Fabric props apart
  from the clone a native-driver update makes, and measurements use them.
  Not exercised in the VM.
- P3 9, window teardown: did not reproduce, and the suggested fix does not
  work. TESTED a `destroy` handler: GTK4 emits it after the children are
  disposed, so the shell touched a dead menu button and aborted under fatal
  criticals. Nothing in this host closes a window without `close-request`
  (no `g_application_quit`, SIGTERM unhandled), so the handler stays on
  `close-request`.
- P3 10, underscores: menu labels escape `_`; the probe menu `Probe_Menu` shows
  its underscore ([menu](one-linux-native-review3-menu-underscore.webp)).
- P3 11: `One.linux.AppCommands` is typed `OneLinuxAppCommands`.
- Simplifications taken: D1 through the size-affecting prop check and D3
  through the Fabric insets. Not taken: D2 (a shared keystroke tokenizer in
  native-core) and D4 (one header bar per window, a design choice for s72425);
  D5 (control measured twice per allocation) because GTK caches those measures
  and the vertical minimum depends on the allocated width.

**Mac check after the shared wrappers, 2026-10-24, one-linux-m5.** RAN a
release build of `tests/macos-basic` at 2a2a4cec85 (BUILD SUCCEEDED, binary
sha1 634068522109) against the dev bundle on studio-64, driven through
cua-driver accessibility actions. No regression found.

- TESTED controls through the shared factories: Button presses count once,
  SegmentedControl selection and `changes` increment, an app-rejected selection
  keeps the old value with a new revision, Disable controls makes presses no-ops,
  borderless and bordered styles apply, and unmount then remount keeps state
  ([controls](one-linux-native-mac-controls.webp), [select](one-linux-native-mac-select.webp),
  [reject](one-linux-native-mac-reject.webp), [unmount](one-linux-native-mac-unmount.webp)).
- TESTED app commands: App, Fixture, More and View menu items each add exactly
  one in steady state (the driver sometimes lands a submenu click late; it never
  doubled). cmd-shift-[, cmd-alt-k, cmd-shift-9 (hidden), up, ctrl-tab and
  ctrl-shift-tab each add one ([keys](one-linux-native-mac-keys.webp)). Remove
  listener sets `listening false` and the fixture items stop counting; Add
  listener and one press adds one. Configure invalid shows
  `bindings[0]: unsupported key 'cmd-k cmd-s'` and the fixture menus stay
  ([invalid](one-linux-native-mac-invalid.webp)). Reload host changes the tag,
  resets counts and one press adds one ([reload](one-linux-native-mac-reload.webp)).
- NOT CONFIRMED: bare `tab` and `shift-tab` (context `!Input && !Terminal`)
  did not count from a foreground driver key, and background `postToPid` keys
  did not register at all on the inactive app, so that probe cannot tell. INFERRED
  not caused by the shared wrappers: the JS config and the native key path
  (`OneMacosAppCommands.mm`, which only lost the moved context parser) are
  unchanged for it, and `up` with the same context counts. AppKit may consume a
  plain Tab for key-view movement. Disproved by a baseline build at dba04ff088
  counting plain Tab.
- NOT TESTED: File > New Window with two windows, and Stack and Tabs at
  runtime. `tests/macos-basic` has no routes. By reading, the only Mac change
  there is the shared re-export of the Stack layout helper (see below).

**Combined source check, 2026-10-24, one-linux-merge (s80603 for s72425).**
Source: Linux branch plus the Mac minor batch tm/macos-resume 7fe12ef4c8
(merge 38109a2814), studio-64.

- RAN `bun run build` and `bun run lint` in `packages/one`: build passed, lint
  0 errors.
- Fixed a merge defect: `OneMacosRootView.mm` declared the `_darkAppearance`
  ivar twice (the Mac batch and the Linux branch each carried it), so the Mac
  host did not compile. The duplicate is removed (736922cc15). The Linux host
  and native-core are untouched by the merge (empty diff against the Linux
  parent).
- Two stale local products, not source: the gitignored `MacosBasic.xcodeproj`
  lacked the Bundle JavaScript phase until `xcodegen generate` ran, and the
  vxrn `dist` predated the Mac bytecode work, so the dev server sent plain JS
  until `bun run build` in `packages/vxrn`.
- `tests/macos-basic/probe/Controls.tsx` gained a prominent Button, a
  PopUpButton with a Select Name button, and a line showing prominent presses,
  popup index and changes, and the color scheme.
- TESTED Release (embedded `main.jsbundle`, 2,927,638 bytes, the file the
  process maps, no network): Button, SegmentedControl, rejected selection,
  disable, borderless and bordered styles, unmount and remount, the prominent
  Button, the PopUpButton, app commands and menus, and a live light to dark and
  dark to light change that re-rendered `scheme`
  ([controls](one-linux-merge-mac-release-controls.webp),
  [commands](one-linux-merge-mac-release-commands.webp),
  [light](one-linux-merge-mac-release-light.webp),
  [dark](one-linux-merge-mac-release-dark.webp)). Reload host is a no-op in
  Release (INFERRED: `DevSettings.reload` is dev only).
- TESTED Debug against the dev server (bytecode served): controls, menus, keys
  and Reload host (tag and counts reset, one press adds one)
  ([debug](one-linux-merge-mac-debug.webp)).
- NOT TESTED: bare `tab` and `shift-tab` (open item above), File > New Window
  with two windows.
- TESTED Linux release host in the `one-linux` VM (headless sway, uinput
  pointer, `tests/linux-basic` bundled for `linux`, VM hermesc bytecode).
  `build-core.sh release` reported no work to do: the merge changed none of the
  Linux or native-core sources, and the binary was built at 22:37 after the last
  C++ change. First frame with RN text at 955 ms on a cold VM page cache. The
  Home tab rendered, a click on Push detail mounted the Detail page under the GTK
  back header ([push](one-linux-merge-linux-push.webp)), and Back then Open
  native controls showed the controls page
  ([controls](one-linux-merge-linux-controls.webp)); a click on the switch and on
  Press me toggled it and counted 1
  ([after](one-linux-merge-linux-controls-after.webp)). Only the known VM
  warnings (no GPU, no session bus) printed. The images show an asset error
  because I did not copy `dist/assets` beside the bundle in this run, a setup
  omission and not a defect. Not run: the Linux dev server path.

**M4 app shell and routing, 2026-10-25, s79947 for s72425.** TESTED
`tests/linux-basic` with the arm64 release host and embedded Linux bytecode.
The default route opens the routed demo; the original composition demo is
preserved at `/controls`.

| behavior | GTK owner | proof |
| --- | --- | --- |
| Stack push and native back | `GtkStack`, `GtkHeaderBar` | [push](one-linux-native-m4-stack-push.webp), [back with edited text and RN counter retained](one-linux-native-m4-stack-back.webp) |
| Tabs and state retention | `GtkStackSwitcher` in a header bar | [Settings](one-linux-native-m4-tabs.webp), [state after returning](one-linux-native-m4-tabs-retained.webp) |
| Tab press contracts | React Navigation and the existing controlled protocol | [prevented selection stays Home](one-linux-native-m4-tab-prevented.webp), [repeated press event](one-linux-native-m4-repeat.webp) |
| Sidebar selection | `GtkStackSidebar` | [Places route](one-linux-native-m4-sidebar.webp) |
| Menus and actions | `GMenu`, `GtkPopoverMenu`, `GSimpleActionGroup` | [submenu](one-linux-native-m4-menu.webp), [menu increments 3 to 4](one-linux-native-m4-menu-action.webp) |
| Key contexts | shared Mac predicate parser | [Input command](one-linux-native-m4-commands-input.webp), [outside Input](one-linux-native-m4-commands-outside.webp) |
| Multiple windows | `GtkApplicationWindow`, one runtime and command group each | [separate routes and command counts](one-linux-native-m4-two-windows.webp), [native New Window action](one-linux-native-m4-menu-new-window.webp), [close second window](one-linux-native-m4-window-closed.webp) |

One's shared Stack layout and native Tabs screen processing still own file
routes, protected screens and React Navigation state. Linux supplies the GTK
presentation for `StackRouter` and `TabRouter`. The native viewport reports its
content bounds so React Native owns layout within each page. Only the visible
page participates in pointer hits; GTK hides the other pages and their focus
targets. Both header back and RN back dispatch through navigation rather than
mutating GTK's stack independently. Tab selection can be prevented, and repeated
primary-button presses emit the standard tab event and behavior flags.

Mac and Linux now share AppCommands listener management, command types, the
TurboModule methods and the key-context predicate parser. The Mac Stack layout
helper is shared without importing the Mac navigator into a Linux bundle.
The GTK widget choices follow [GTK's StackSwitcher example](https://gnome.pages.gitlab.gnome.org/gtk/gtk4/getting_started.html)
and [GNOME's header bar guidance](https://developer.gnome.org/hig/patterns/containers/header-bars.html).
No libadwaita dependency was needed for this milestone.

The running probe broke two assumptions during development: root navigators
have no parent tab listener, and the installed React Navigation `navigate`
action takes a name and params, not a route object. Both adapters now follow
the installed native-stack and bottom-tabs source contracts. Temporary native
selection probes were removed before the clean release build.

RAN full One package build, Mac/Linux declaration emit and static view-config
generation (11 Linux specs), incremental release host build, Linux route bundle,
Hermes bytecode compilation, package lint (zero errors, eight existing warnings)
and real uinput interactions. Routing, state and tab cancellation ran with fatal
warnings. Submenus and windows ran with fatal criticals: Sway 1.9 triggers GDK's
visible warning that popup repositioning is unavailable. GTK's documented
remapping path handles it; no application workaround suppresses that warning.
No automated tests were added. Mac runtime and wider platform checks remain
with ci-manager through s72425.

RAN a warm startup observation for the routed release fixture under concurrent
host load: the first mount painted at 60.9 ms and the first frame containing
visible RN text at 101.9 ms, measured from process start. This is one observation,
not a distribution or a comparison with the older composition fixture. The
opt-in startup timeline now distinguishes those two milestones; the native
shell's first frame is not reported as main content. The capture and error-free
JS startup identify the first RN text as the routed Home content.

**Review 2 repairs, 2026-10-25, s79947 for s72425.** The lead-assigned
findings in `linux-review2-findings.txt` were repaired before M4. TESTED Stepper's
native API in the arm64 release VM: `label="Amount"`, `in={[0, 3]}` and
`onValueChange={setCount}` render a native label and numeric value. Two real
increment clicks advance 2 to 3 and stay at the upper bound:
[Stepper contract](one-linux-native-stepper-contract.webp). The public wrapper
now matches One's native Stepper range and callback shape; the GTK control
remains a spin button with a label. Its disabled fixture and every Linux sender
use the same API. RAN incremental release host build, full One package build,
Linux bundle, Hermes bytecode compilation and package lint (zero errors,
existing warnings). No automated tests.


TESTED review 2 measurement repair in the same arm64 VM. A temporary native
snapshot probe sees the baseline's first control frame with 9 controls and 8
zero allocations, then a second frame with all 9 allocated. GDB counts nine
`UIManager::updateState` calls on the JavaScript thread. The review's claim
that those calls commit synchronously on GTK's thread does not reproduce:
`ConcreteState` defaults to the asynchronous event queue in the installed RN.

The repair measures once after a mount transaction has inserted its controls,
then uses RN's `cloneMultiple` to commit every changed natural size together.
The active mount consumes that follow-up transaction before GTK paints. GDB
sees one batch on the main thread, zero per-control update calls, and all nine
controls allocated in their first frame. Measurements whose props have already
been replaced by a newer React commit are discarded. Theme changes use the
same batch path. No RN source changed, and the temporary snapshot probe was
removed before the clean release host rebuild.

TESTED a stale measurement race found during the final source check. A temporary
native event changes only the button's `testID` on the JS thread after GTK has
measured its old props. The baseline correctly rejects that stale measurement,
but its size cache then suppresses submission for the current props and leaves
the button at height zero: [before](one-linux-native-measure-race-before.webp).
The mount now checks Fabric's accepted size as well as GTK's cache, and submits
when Fabric still differs. Under the same forced race, the stale batch is still
rejected and the current props receive a 159 by 34 natural size, with a 34-pixel
layout height: [after](one-linux-native-measure-race-after.webp). Temporary
probe code was removed before the clean release host rebuild. RAN that build;
TESTED route push/back and a native button counter on the clean host. No automated tests.

TESTED review 2 pending Stepper edits. A plain parent rerender leaves the
control memoized and does not reproduce the reported loss. Changing its
unrelated native `testID` with that parent rerender does reproduce it: an
unsubmitted 1 becomes the controlled 2. Controls now apply only changed props
and actual controlled-value changes. With the repair, the entry still contains
1 after the parent rerender while React's accepted value remains 2:
[pending edit](one-linux-native-stepper-pending-edit.webp). This covers finding
5 together with measurement simplification S6, as assigned by the lead.

TESTED review 2 popup surface boundary. The baseline named probe does not
reproduce the proposed phantom press on GTK 4.14 under Wayland: selecting Beta
in the real DropDown leaves the top-left RN target at zero presses, downs and
ups. The host now explicitly ignores pointer events from other GdkSurfaces.
Repeating the selection on the repaired release host still changes the GTK
selection and leaves all RN counters at zero:
[popup surface](one-linux-native-popup-surface.webp). RAN incremental release
build and real uinput events with fatal GTK warnings enabled.

TESTED review 2 undersized native controls. The baseline `width: 20,
height: 20` TextField and Stepper do not emit a GTK warning on GTK 4.14 with
`G_DEBUG=fatal-warnings`, so that proposed warning failure does not reproduce.
The Stepper does visibly escape its RN box. Native controls now allocate at
least GTK's measured minimum and clip their drawing and GTK picking to the RN
frame when it is smaller. The same probe stays running with fatal warnings,
keeps the 20-pixel boxes and no longer draws the Stepper outside its box:
[control minimum](one-linux-native-control-minimum.webp). A click where the
now-clipped increment button used to draw leaves the numeric value at 2.
This allocation guard also covers the existing RN TextInput control path.
RAN incremental release host build; no automated tests.

TESTED review 2 Slider cancellation with real uinput button and motion
sequences. The baseline reproduces both proposed failures: disable during a
held interaction yields one start and zero completions; a revision change while
held also leaves one start and zero completions. Disable now completes the
active interaction before GTK disables it:
[disabled completion](one-linux-native-slider-disable-fixed.webp).
A revision change completes the old revision, retains the physical pointer,
and starts a new pair on continued input. After continued uinput motion and
release, the fixture shows two starts and two completions:
[revision completion](one-linux-native-slider-revision-fixed.webp).
The JS wrapper accepts a final completion only for its tracked start, including
an old revision that just ended. Programmatic value setters cannot start a
pair. RAN release host and full package builds, Linux bundle and bytecode,
with fatal GTK warnings; no automated tests.

TESTED review 2 pointer pairing. With the baseline window floating, pressing
on the desktop, moving into the RN target and releasing produces up 1 with
down 0 and presses 0. The repaired host ignores that untracked release:
[untracked release](one-linux-native-pointer-unpaired-fixed.webp).
A normal click then reports down 1, up 1 and presses 1; moving to empty space
clears hover: [normal pair](one-linux-native-pointer-paired-fixed.webp).
The named box-none-root probe does not reproduce stale hover on this routed
fixture, whose ancestors can still provide a hit target. The null-hit path now
explicitly emits leave and clears its last target as well. RAN incremental
release build and real uinput interactions under fatal GTK warnings.

TESTED simplification S1: Switch now uses the same measured control props,
event emitter and numeric controlled-value protocol as Toggle. Its public
boolean API is unchanged. The separate Switch C++ implementation and the
mounting manager's second control path are removed. Real switch and segment
interactions still accept changes, acknowledge rejected changes and reset at
a new revision without events: [accepted](one-linux-native-switch-fold-accepted.webp),
[rejected](one-linux-native-switch-fold-rejected.webp),
[revision reset](one-linux-native-switch-fold-revision.webp).
RAN clean incremental release host and full package builds, the controlled
fixture bundle and Hermes compilation under fatal GTK warnings.

TESTED simplification S4: ProgressBar now takes only its read-only value and
activity mode, without revision, acknowledgement, change events or controlled
hooks. Native progress updates bypass the input protocol. The existing ten
control fixture switches from [activity mode](one-linux-native-progress-mode.webp)
to [determinate progress](one-linux-native-progress-determinate.webp), following
a real Slider drag from 25 to 71 percent with one start and one completion.
RAN full package build, incremental release host build, Linux bundle and
Hermes bytecode. No automated tests.

RAN simplification S3's codegen feasibility probe. RN's parser rejects an
imported props base with `Unable to handle prop spread: ControlledProps`.
Lead s72425 directed keeping wire declarations local rather than adding a
type import inliner. The public wrappers and generated declarations now share
view props, disabled/revision props and numeric/text event types through
`platform/controlTypes.ts`. Native codegen inputs remain self contained.
RAN full package build, static specs and declaration generation; package lint
has zero errors and eight existing warnings. No automated tests.

TESTED simplification S2: each GTK control now owns its creation, updates,
event handlers and cleanup in one per-kind implementation. Only registration
maps Fabric handles to those implementations; the mounting manager keeps one
control interface. Numeric controls still share the acknowledgement helper,
text fields share their entry implementation, and read-only progress owns
only its animation callback.

The rebuilt release host accepts toggle, Stepper, plain text and password
input, including two submits: [fields](one-linux-native-kinds-fields.webp).
Switch, Button, segments, Slider, progress and both dropdown forms retain
state in RN scrolling content: [selection](one-linux-native-kinds-selection.webp).
A revision during a held Slider interaction still yields two starts and two
completions: [cancellation](one-linux-native-kinds-cancel.webp).
RAN incremental release host build and real uinput interaction with the
existing fixture bytecode under fatal GTK warnings. No automated tests.

TESTED simplification S5: Mac and Linux Button, Toggle and SegmentedControl
now use shared wrapper factories and public prop types. Platform adapters
preserve the actual wire contracts: Mac Button has a direct press event,
Linux Button acknowledges counted events, Mac Toggle/segments carry named
boolean/index fields, and Linux carries numeric values. Mac Toggle now passes
RN ViewProps and style through. Its disabled API remains unchanged.

The Linux release host accepts the shared Toggle, Button and segment handlers:
[accepted](one-linux-native-shared-controls-accepted.webp). Rejected edits
preserve accepted values while acknowledgements advance:
[rejected](one-linux-native-shared-controls-rejected.webp). A revision reset
restores values without adding events:
[reset](one-linux-native-shared-controls-reset.webp).
RAN full One package build including Mac declarations, static view configs,
Linux bundle, Hermes bytecode and package lint (zero errors, eight existing
warnings). Mac runtime interaction remains with CI; native Mac code and wire
specs did not change. No automated tests.

**M3 continuation, 2026-10-25, worker s79514 for s72425.** TESTED all ten
controls in the studio-64 Ubuntu arm64 VM, GTK 4 release host and embedded
Linux Hermes bytecode, with `G_DEBUG=fatal-criticals`. The four additions are
Toggle, Stepper, TextField and SecureField. This is the worker's selection
within M3. Toggle follows the existing Mac label/isOn contract. Stepper and
the fields reuse One's native numeric and text contracts in
`platform/generated/Controls.native.tsx`.
They cover boolean, bounded numeric, plain text and password input through
`GtkCheckButton`, `GtkSpinButton`, `GtkEntry` and `GtkPasswordEntry`.

All four wrappers use `platform/controlled.ts` and the same native controlled
value helper as Switch, extended to string values. The fields share one wrapper
implementation. Accepted edits produce toggle true, stepper 2.25, text
`linux`, a masked three-character password and two Enter submissions. Rejecting
edits leaves those values unchanged. A revision reset restores false, 2, `One`
and the four-character password without emitting changes. Rejecting another
edit to each control at revision 1 keeps the reset values. Captures:
[accepted](one-linux-native-ten-controls-accepted.webp),
[rejected](one-linux-native-ten-controls-rejected.webp),
[reset](one-linux-native-ten-controls-reset.webp),
[rejected after reset](one-linux-native-ten-controls-revision-rejected.webp).
The fixture is `tests/linux-basic/probe/m3-controls.tsx`, the controls tab of
`probe/review.tsx`. Disabled counterparts are visible alongside the controls.

TESTED theme-derived intrinsic measurement. GTK measures each actual control
on its main thread and publishes its natural size as Fabric state; Yoga applies
RN style constraints. The wrappers have no default layout boxes. The initial
unmeasured frame stays unallocated until state arrives, because GTK entries
cannot allocate their internals at zero. Theme, dark preference, font and DPI
notifications schedule one measurement after GTK's next style/layout frame.
Changing to Adwaita-dark and Sans 20 grows Toggle from 173x26 to 292x40 and
Stepper from 112x34 to 135x46. RN text retains its explicit font size and the
control rows reflow: [theme and font](one-linux-native-ten-controls-theme.webp).
Measuring directly from the settings notification reproduced stale bounds;
waiting for GTK's after-paint signal repairs that ordering.

TESTED Slider completion callbacks with real pointer and keyboard events. A
pointer interaction ends at 85 percent with two starts and two completions
including the preceding pointer click. Left arrow changes to 84 percent and
increments both counters once. Reset restores 25 percent at revision 1 while
both counters remain three and the last completed value stays 0.84. Captures:
[pointer](one-linux-native-slider-completion-pointer.webp),
[keyboard](one-linux-native-slider-completion-key.webp),
[programmatic reset](one-linux-native-slider-reset-determinate.webp).
`onSlidingStart` and `onSlidingComplete` carry value and revision. The native
controller observes GTK input without consuming it and reads the final value
after GTK handles release. Touch, wheel and focus-loss paths follow that same
source contract but were not separately exercised in this proof.

TESTED ProgressBar activity mode: omitting value pulses the GTK bar, with the
activity block at different positions in the pointer and keyboard captures.
Changing back to determinate renders the current fraction; the reset capture
shows both bars at 25 percent. The GTK frame callback is active while mapped
and removed on determinate mode or destruction.

TESTED DropDown tagged items, following One.iOS.Picker's distinct selection
and Text tag semantics. `items: {label, value}[]`, `selection: string | null`
and `onSelectionChange` preserve distinct values with duplicate labels:
[beta selected](one-linux-native-dropdown-tagged-beta.webp).
After an accepted change to alpha, reversing the items preserves alpha at its
new index without another event:
[reordered popup](one-linux-native-dropdown-tagged-reordered.webp).
Rejecting Gamma restores alpha:
[rejected](one-linux-native-dropdown-tagged-rejected.webp).
Clearing selection renders GTK's empty selection without a native event:
[cleared](one-linux-native-dropdown-tagged-cleared.webp).
Values must be unique; labels may repeat. The existing labels/selectedIndex
contract remains available and selects Beta/index 1 in the composition capture.
Both modes share one event counter and the controlled value helper.

TESTED RN content and native controls inside the same ScrollView. At RN offset
595, the composed GTK Toggle updates React state while RN text and four rows
remain visible, with controls clipped at the viewport edge:
[scrolled composition](one-linux-native-ten-controls-scroll.webp).

RAN: incremental Linux release host builds, One JS and declaration generation,
static specs (ten Linux specs, 50 mirrors), SDK generation, `one build
--platform linux`, Hermes bytecode compilation, source lint on 24 files with
zero warnings or errors, real uinput interactions and 2560x1600 captures.
The package build encountered external-volume file-load EPERM errors; the JS
and declaration stage then passed, and its static-spec/SDK stages passed when
run separately. No single end-to-end package build success is claimed. The
package-wide lint also completed with zero errors and eight existing warnings
outside the changed files. No automated tests were added, RN source was not
changed, and no startup timing comparison was made under concurrent load.

Contract sources: One's `platform/mac/Toggle.macos.tsx`,
`platform/generated/Controls.native.tsx`, `platform/generated/controlTypes.ts`
and `ios/Generated/OneNativePickerView.swift`;
[GTK Widget.measure](https://docs.gtk.org/gtk4/method.Widget.measure.html),
[GTK threading](https://docs.gtk.org/gtk4/section-threading.html),
[GTK CheckButton](https://docs.gtk.org/gtk4/class.CheckButton.html),
[SpinButton](https://docs.gtk.org/gtk4/class.SpinButton.html),
[PasswordEntry](https://docs.gtk.org/gtk4/class.PasswordEntry.html),
[React Native Slider](https://github.com/callstack/react-native-slider),
[GTK range](https://docs.gtk.org/gtk4/class.Range.html),
[progress](https://docs.gtk.org/gtk4/class.ProgressBar.html) and
[dropdown](https://docs.gtk.org/gtk4/class.DropDown.html).

TESTED input limits in the release VM host with real typing and clipboard
paste, for single-line and multiline fields at limits 0, 1 and 2. Typing `abc`
keeps empty, `a` and `ab`, with change counts 0, 1 and 2. Pasting an emoji
keeps empty at 0 and 1 and accepts its two UTF-16 units at 2. Pasting `A😀B`
keeps only `A` at both positive limits. Pasting `e` plus a combining acute
accent rejects the whole composed character at 1 and accepts both units at 2.
Both modes agree and rejected zero-limit inserts emit no changes. Unlimited
remains distinct from zero; both GTK insert paths share the UTF-16 budget and
Pango composed-character boundary calculation. The exact final source passes
the incremental release host build. Captures:
[ASCII](one-linux-native-limits-ascii.webp),
[emoji](one-linux-native-limits-emoji.webp),
[mixed](one-linux-native-limits-mixed.webp),
[composed](one-linux-native-limits-composed.webp).

TESTED WebSocket cleanup in the VM: 20 unique JS connections open and close
without failures. GDB observes 20 native Socket destructors and a registry size
of zero after every terminal close, with fatal GTK checks enabled. The closed
handler removes the entry while keeping its socket and connection alive through
the callback. Worklets now shares `OneLinuxDispatchMain` instead of a duplicate
idle dispatcher with the same priority and lifetime behavior. Debug and release
host builds pass. Capture: [socket cleanup](one-linux-native-socket-cleanup.webp).

TESTED image request identity in the VM: a temporary native probe held A's
queued completion, mounted B, then drained A's completion, progress and failure.
The log records A request 1, B request 2, then A drain. The screen keeps B's
green 48x32 image and emits only B's load and end, with no stale progress or
error. Observers now belong to individual requests, callbacks carry a manager
unique request ID, and all three delivery paths reject stale IDs. The temporary
hook was removed and the clean debug target rebuilt. Capture:
[image race](one-linux-native-image-race.webp).

Switch and the new controls now share one controlled-value helper for native
changes, acknowledgements, revision resets and the programmatic application
guard. TESTED accepted changes (two events), rejected changes (four events,
values preserved), and rejected changes after revision reset (six events,
revision 1). Captures: [accepted](one-linux-native-controlled-shared-accepted.webp),
[rejected](one-linux-native-controlled-shared-rejected.webp),
[reset](one-linux-native-controlled-shared-reset.webp).

The common review UI is in `tests/linux-basic/probe/review.tsx`. To bundle it,
temporarily export it from the demo's `app/index.tsx`, build for Linux, then
restore that entry. `probe/server.py <assets directory>` serves the image and
WebSocket fixtures on loopback port 8123. The review UI also carries the input
limit and WebSocket probes.

RAN Mac literal isolation check: `StackToolbarBottomHost.macos.tsx` is restored
byte for byte to `9b92552c77^`. Minifying the baseline and restored module with
the same production transform yields identical 243-byte outputs, also compared
with `cmp` inside the VM. This removes the nonconstant Mac error-string change.
This is a module byte gate; full release bundle comparisons remain a delivery
check for the lead and CI owner.

TESTED GTK picking in the VM with real clicks on Switch, Button and TextInput:
under `none` and `box-only`, all three stay inactive and the fields receive no
focus; `auto` and `box-none` toggle, click and focus normally. RN receives zero
touches for `none` and three for each other column, with `box-only` targeting
its parent. Keyboard Shift-Tab still reaches the two pointer-blocked fields
and accepts typing. Picking uses GTK's `can-target`, not sensitivity, and is
updated when views mount, move or change pointer policy. Captures:
[mouse](one-linux-native-picking.webp), [keyboard](one-linux-native-picking-keyboard.webp).

TESTED nested hover in the VM: entering a child sends one parent enter and one
child enter; moving back to the parent sends one child leave with no parent
leave or second enter; leaving the window sends one parent leave. The host now
sends moves at the hit target and one root leave, following RN's mouse path.
RN owns hover synthesis. Captures: [child](one-linux-native-hover-child.webp),
[parent](one-linux-native-hover-parent.webp), [outside](one-linux-native-hover-outside.webp).

TESTED window close ownership: the original release host raised an invalid
GObject class pointer while closing its last window with `G_DEBUG=fatal-criticals`.
The host now holds its own surface reference until runtime and pointer teardown
finish. Repeating the close in debug and release exits 0 with fatal criticals
still enabled. The capture and close use the same attachment fixture.

**Accepted Linux review repairs, 2026-10-24.** Lead s72425 accepted s78886's
review and assigned repairs before more M3 controls: inline text attachments,
RN hover synthesis, GTK pointer picking, the Mac error literal, image request
identity, WebSocket cleanup and UTF-16 input limits. These repairs and the
reproduced window close ownership failure are now fixed and probed above.
They are lead-assigned repairs to the existing contract, not new owner feature
direction. At the subscription quota handoff, s72425 owns the successor and CI
delivery; this worker starts no further M3 work.

TESTED in the Ubuntu arm64 VM: inline View and Image children mount in debug
and release without an RN patch or attachment assertion. Pango shape attributes
reserve their measured sizes; the measurement returns an entry for each child,
including clipped attachments. The probe covers normal, wrapped, ellipsized and
right aligned text. Unlimited paragraphs now wrap rather than ellipsizing by
default. The attachment iterator is skipped for paragraphs with no attachments.
Captures: [release](one-linux-native-attachments-release.webp),
[debug](one-linux-native-attachments-debug.webp).

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

1. The app was bundled for platform `ios` (Metro on the Mac) at this point; the
   real `linux` platform replaced it below. hermesc runs in the VM. The bytecode in the release run came from the debug hermesc; the
   format is the same, a release hermesc was not compared.
2. The VM has no GPU, so GTK uses the software path and prints GL and a11y bus
   warnings.
3. The module context reports idiom `desktop` and the uname OS version.
4. Pango `line_height_absolute` placement is not compared against iOS centering.
5. No transforms, pointer events, images, scroll views, text input, dark mode
   or GTK controls yet (pointer events, scroll views, text input and dark mode
   landed in M2 below).
6. The `-include cstdint` workaround from the core slice still applies.

**M1 on the real `linux` platform, 2026-10-23.** The app bundles for platform
`linux`, loads from the dev server with Fast Refresh, and a GTK switch
round-trips React state. Machine: studio-64, Lima VM, headless sway and grim.
Proof: [switch off](one-linux-native-linux-switch-off.png),
[switch on](one-linux-native-linux-switch-on.png) (a pointer click on the GTK
switch, then React renders "switch on"), and the debug host on the dev server
[before](one-linux-native-linux-dev-before.png) and
[after](one-linux-native-linux-dev-after.png) an edit to `app/index.tsx`
(screenshotted after the first painted frame; Fast Refresh applied the edit
without a restart). Mac host check after the shared host move:
[one-linux-native-mac-host.png](one-linux-native-mac-host.png), a Release build
of `tests/macos-basic` launched against its dev server.

- **JS platform:** `linux` follows the `macos` change (484d81cd54). The shared
  `NativePlatform` type, `.linux.*` then `.native.*` resolution, the react-native
  internals resolve (the macOS resolver is now `desktopReactNativeResolve`), an
  owned `Platform` with `Platform.OS === 'linux'`, `One.platform` including
  `'linux'`, `/index.bundle?platform=linux`, and `one build --platform linux`.
  The `.linux` counterparts of the `.macos` layout, split view, image and
  adaptive files re-export the `.macos` ones. `tests/linux-basic` is the test
  app. iOS, Android, web and macOS bundles were checked by diff review only,
  no byte-for-byte bundle comparison; `one build --platform macos` still builds.
  `bundle-js.sh js` now runs `one build --platform linux`, so the Metro proof app
  `packages/one/linux/app/` is gone.
- **Native modules the app needed:** the host now provides NitroModules, worklets
  (TurboModule, UI scheduler on the GLib main context, 16 ms animation frames,
  an unavailable networking backend), op-sqlite on the system sqlite
  (`$XDG_DATA_HOME/one`), Linking through GIO, an ImageLoader that rejects,
  WebSocketModule and Networking on libsoup 3 (text and base64 responses, string
  and base64 bodies; no blob responses, form data, incremental updates or
  timeouts), and the dev bundle URL download.
- **Switch:** `OneLinuxSwitch` Fabric component with a `GtkSwitch` as the
  OneView control, using the controlled protocol (`src/platform/controlled.ts`).
  `OneView` takes pointer hits only over its children (a `contains` override),
  because a non-targetable parent hid the switch from GTK picking.
- **Startup of the real `linux` bundle** (release, bytecode, process start to
  first frame with content, studio-64 VM, ms): 164.0, 172.7, 174.5, 179.6. The
  first run after a VM boot was 3.0 s (cold page cache). That is about 45 ms
  over the `ios` stand-in bundle (127 ms), from Nitro, worklets, op-sqlite and
  the navigation modules in the bundle. The debug host on the dev server
  downloads the bundle in about 6 s and mounts at about 21 s, nearly all of it
  Hermes evaluating the unminified dev bundle.

**Startup breakdown of the real `linux` bundle, 2026-10-23** (release, bytecode,
studio-64 VM, warm, ms, temporary marks in the host and the app, since removed).
One marked run: main 12, gtk activate 24, runtime ready 91, TurboModules created
92 to 101 (worklets init about 4), index module eval 101.5, first transaction
mounted 106, first frame painted 143. Nine interleaved warm runs painted at 128 to
149 ms (mean about 140), against the 164 to 180 ms in the table above, so the
earlier runs sat in a noisier VM state. Runtime ready (80 to 95 ms) is the same as
the ios stand-in's 96 ms; the JS side (TurboModule setup about 9, bundle eval and
mount about 15) adds about 25 ms and the rest is the 35 to 40 ms from mounted to
painted. No single cause dominates and nothing has a clean fix at its owner, so
no source changed. The ios stand-in was not re-measured interleaved.

Workarounds and gaps:

1. libstdc++ transitive headers: Nitro, worklets and op-sqlite sources compile
   with `-include memory`, `unordered_map`, `iterator`, `algorithm` and a
   `nullptr_t` shim (`cpp/compat/OneLinuxStdCompat.h`), on top of `cstdint`.
   worklets `AsyncQueueImpl.cpp` uses Apple's one-argument `pthread_setname_np`,
   so a force-included `cpp/compat/OneLinuxThreadName.h` maps it for that file.
2. New VM packages: `libsoup-3.0-dev` and `libsqlite3-dev` (and sway, grim).
3. The dev server rejects the hostname `host.lima.internal` (Vite
   `allowedHosts`); the VM reaches it as `http://192.168.5.2:8098`.
4. The switch measures at a fixed 46x26. A sway headless session has no pointer,
   so the click test runs sway as root with the libinput backend and a uinput
   device (ydotool), and moves and presses through `swaymsg seat - cursor`.
5. No Blob, FileReader, ImageLoader, XHR timeout or form data modules. No
   transforms, scroll views, text input, dark mode, or general pointer events
   (a view's `onPress` does not work yet; only controls inside it do).
6. The VM disk moved to `/Volumes/Samsung-1TB-990/lima/one-linux` with a symlink
   at `~/.lima/one-linux` (studio-64 internal disk was at its floor). The VM
   booted from the moved disk and kept its caches.

**M2 pointer press, 2026-10-23.** `Pressable` and `onPress` on views work on the
Linux host. Machine: studio-64 VM, release build, headless sway with a uinput
pointer. Proof: [before](one-linux-native-press-before.png) and
[after three clicks](one-linux-native-press-after.png) on the counter in
`tests/linux-basic`; the switch still toggles in the same build.

- `OneLinuxPointerHandler` (`packages/one/linux/host/OneLinuxPointer.*`) is a
  capture phase `GtkEventControllerLegacy` on the surface view that never claims
  an event, so controls keep their own clicks. It hit tests the `OneView` tree by
  React's frames (last sibling first, `pointerEvents` honored, clipping honored)
  and sends `onTouchStart`, `onTouchMove` and `onTouchEnd` (`onTouchCancel` on a
  broken grab) through the target's `TouchEventEmitter`, the path the Mac host
  feeds. Pressability and the responder system run unchanged.
- It does not use GTK picking, because the `contains` override only answers over
  children and a leaf view has none.
- Gaps: no hover or pointer events (`onPointerDown`, `onPointerEnter`, cursor), no
  touchscreen sequences, and `screenPoint` equals the window point because Wayland
  gives clients no global position.

**M2 scrolling, 2026-10-23.** `ScrollView` runs on a `GtkScrolledWindow`. Proof:
[top](one-linux-native-scroll-before.png) and [after four wheel notches](one-linux-native-scroll-after.png)
(offset 224 reported to JS through `onScroll`, overlay scrollbar showing). Same
machine and build as the press proof; the wheel is a uinput device.

- The `ScrollView` Fabric component gets a `OneView` whose control is the
  `GtkScrolledWindow` and whose content `OneView` holds the React children, sized
  to the state's content size. Scrollbar indicator props map to the policies (the
  axis that does not scroll is external so the window never asks for the content's
  size), `scrollEnabled` blocks wheel input, `onScroll` honors
  `scrollEventThrottle`, the offset commits to state 100 ms after scrolling settles
  (where `measure()` reads it), and `scrollTo` and `scrollToEnd` commands apply
  without animation.
- Pointer hit testing descends into a scroll view's content shifted by the offset.
- Gaps: no `contentOffset` prop at mount, `onScrollBeginDrag`, `onScrollEndDrag`
  or momentum events, content insets, animated `scrollTo`, `RefreshControl`, or
  sticky headers.

**M2 text input, 2026-10-23.** `TextInput` runs on a `GtkText`. Proof:
[before](one-linux-native-input-before.png) and
[after typing "hello world", two backspaces and Enter](one-linux-native-input-after.png)
(the echo label reads `typed "hello wor"`, the border went blue on focus and back
to grey when Enter blurred it). Real key events came from a uinput keyboard under
sway on the studio-64 VM.

- `OneLinuxTextInput` follows the controlled protocol the Mac host follows: each
  user edit bumps an event count, calls `onChange`, and writes the text into the
  shadow node state with that count; React's text only replaces the field's when the
  state carries the same count, and programmatic changes never report.
- Events: `onFocus`, `onEndEditing` then `onBlur`, `onSelectionChange` (utf16
  ranges), `onKeyPress` (Backspace, Enter, Tab, Escape or the typed character),
  `onSubmitEditing` honoring `submitBehavior` (BlurAndSubmit blurs), and
  `onContentSizeChange`. Commands: `focus`, `blur`, `setTextAndSelection`.
  Props: `editable`, `readOnly`, `secureTextEntry`, `maxLength` (counted in
  characters, not utf16 units), `placeholder`, `selection`, `autoFocus`, font,
  color and alignment. The field sits in the content frame, so padding and borders
  from the style apply.
- A view is no longer `can-focus` false, only not `focusable`: GTK 4 treats
  `can-focus` false as "no descendant takes focus", which stopped the field from
  ever getting it.
- `selectionColor` sets the selection background through the `selection` CSS
  node on both fields ([window](one-linux-native-selection-color.png)), and
  `placeholderTextColor` colors the multiline placeholder
  ([window](one-linux-native-placeholder-color.png)). The single-line
  placeholder and caret colors are fixed in the continuation below.
  `cursorColor` is Android only in React Native, so it is not a Linux gap;
  Linux follows the iOS and Mac `selectionColor` contract. Gaps:
  `autoCapitalize`, input method position hints, or drag and drop.
- Typed text and placeholder share one vertical position
  ([both](one-linux-native-input-baseline.png), measured: ascender top row 280 and
  baseline row 293 in both). A `GtkText` given no baseline sat its line at the
  baseline of its smallest size, 6 px above center in a 40 px field, while the
  placeholder label was centered. The surface view now allocates a `GtkText` with
  its natural baseline centered in the box, and the field's font goes in its
  style (CSS) so GTK's line metrics match the text.

**M2 dark mode and resize, 2026-10-23.** `Appearance` follows the GTK theme and
tells React when it changes. Proof, studio-64 VM under headless sway: the
test app on the [light](one-linux-native-scheme-light.png) default, then
[dark](one-linux-native-scheme-dark.png) 1.5 s after
`gsettings set org.gnome.desktop.interface gtk-theme Adwaita-dark` with no
restart (the app's `useColorScheme()` flipped through the `appearanceChanged`
event). Floating the window changes its size from 1280x720 to 804x602 and React
relays out to it: [resized](one-linux-native-resize-floating.png).

- `getColorScheme` reads an atomic the host keeps (`OneLinuxHost::dark_`), so
  the JS thread never waits for the main thread. The host seeds it at launch and
  updates it from `notify::gtk-application-prefer-dark-theme` and
  `notify::gtk-theme-name` on `GtkSettings`; dark means the prefer-dark flag or a
  theme name ending in `-dark` or `:dark`. A change emits `appearanceChanged`.
- The Mac host uses the same shape (`_darkAppearance`, seeded from the root
  view's appearance and updated in `appearanceDidChange:`) instead of a blocking
  hop to the main thread on every `getColorScheme`; the unused
  `colorSchemeName()` in `OneMacosModules.mm` is gone. Same change as
  `6af9445f59` and `5538cf4111` on `tm/one-macos-startup`, adapted to the shared
  host module context. A Release build of `tests/macos-basic` with the change
  builds and renders against its dev server
  ([window](one-linux-native-mac-host-m2.png)); a temporary probe then set the
  view's appearance to dark six seconds after launch (the desktop appearance was
  not touched): the native `getColorScheme` read through `TurboModuleRegistry`
  returned dark, `Appearance.addChangeListener` fired once, and `useColorScheme`
  followed, so the cached scheme and the `appearanceChanged` event work on the Mac.
- Gaps: GTK 4.14 has no color scheme setting and the VM has no
  xdg-desktop-portal, so the XDG `org.freedesktop.appearance color-scheme` value
  is not read. GTK controls (switch, field) stay light in the VM because no dark
  GTK theme is installed. The window resize proof is a tiled-to-floating change;
  `swaymsg resize` on the floating window did not change its size.
- **Images (M2):** `Image` mounts through React Native's own `ImageComponentDescriptor`
  and the Fabric image contract. `cpp/imagemanager/OneLinuxImageManager.cpp`
  replaces the cxx stub: it loads `http(s)` (libsoup, with the source's method and
  headers), `file://` and absolute paths (GIO) and `data:` URIs, decodes them to a
  `GdkTexture` off the main thread and delivers them through the request's
  `ImageResponseObserverCoordinator`; a failure, including a non 2xx status, goes
  to `nativeImageResponseFailed`. The mounting manager observes the request from
  the `Image` state: `onLoadStart` when a new source arrives, `onProgress`,
  `onLoad` with the source at its density, `onError` with the message, then
  `onLoadEnd`. `OneView` paints the texture under the radius clip for `cover`,
  `contain`, `stretch`, `center`, `repeat` and `none`, with `tintColor` as an
  alpha mask. A bundled asset resolves through RN's own `AssetSourceResolver`
  to `<bundle dir>/assets/<httpServerLocation>/<name>`, so the image must sit
  there beside `main.jsbundle`; `one build --platform linux` now writes the
  assets to `dist/assets/assets/` next to `dist/linux.js` (checked: `swatch.png`
  lands there), while the proof had copied `swatch.png` by hand. Proof, a local asset, a remote
  URL (a `python -m http.server` in the VM), a missing URL that fires `onError`,
  and the four modes in a 100 px rounded box:
  [window](one-linux-native-images.png). Gaps: `blurRadius`, `defaultSource`,
  progressive loading and packaging the assets with the app.
- **Transforms and opacity (M2):** `restyle` resolves RN's `transform` (already
  adjusted for the transform origin) and `one_view_set_transform` applies it as
  a `GskTransform` in `size_allocate`, anchored at the view's center like a
  `CALayer`. Hit testing maps the pointer into each child through the inverse of its frame and transform (`one_view_map_from_parent`), so presses land on what is drawn. Opacity maps to `gtk_widget_set_opacity`. Proof, translate, scale, rotate,
  opacity and a rotate with `scaleX`:
  [window](one-linux-native-transforms.png). Hit proof, with pressable boxes: a
  click on the empty spot a translated box left does nothing, and clicks inside
  a scaled box and the translated one press them:
  [window](one-linux-native-transform-hit.png).
- **Hover and cursor (M2):** the pointer handler tracks the mouse over the
  OneView tree and sends W3C `pointerOver`, `pointerOut`, `pointerEnter` and
  `pointerLeave` to the views whose `ViewEvents` bits listen, entered outermost
  first and left innermost first. The host turns on the
  `shouldPressibilityUseW3CPointerEventsForHover` feature flag so `Pressable`
  `onHoverIn` and `onHoverOut` fire. The nearest `cursor` style sets the GTK
  cursor by CSS name on the surface. Proof, the mouse over the `text` button
  shows the hover color, "hovered text" and the I-beam:
  [window](one-linux-native-hover.png). Moving out to empty space clears the
  hover (the label returns to "hovered none" and the cursor to the default).
  Touch `locationX`/`locationY` and pointer `offsetX`/`offsetY` are local to the
  target view (through frames, transforms and scroll offsets, the steps hit
  testing takes, in `localPoint`); `pageX`/`pageY` and `clientX`/`clientY` are
  window coordinates. Proof on the scaled box C, the rotated box D and a view
  nested in a padded one (studio-64 VM): C touch 37.8,27.8 and pointer offset
  38.7,28.7 where the transform gives 38,28 and 38.7,28.7; D pointer offset
  46.6,18.4 against 46.7,18.4 from the rotation;
  nested view touch 7.7,9.7 and pointer offset 9,11 from a known origin.
  [scaled](one-linux-native-pointer-coords-scaled.png),
  [rotated](one-linux-native-pointer-coords-rotated.png),
  [nested](one-linux-native-pointer-coords-nested.png). The host sends no
  `pointerdown`, `pointermove` or `pointerup` at this point; these were added
  in the pointer continuation below.
- **Multiline `TextInput` (M2):** `multiline` shows a `GtkTextView` (in a
  scrolled window, word wrapped) instead of the `GtkText`; both live in a
  `GtkStack` the view owns, and the same controlled protocol, focus, key,
  selection and submit paths serve either. The placeholder is a label over the
  empty view. Enter adds a line when `submitBehavior` is `newline`, and
  otherwise submits (shift+Enter still adds one). Font and color come from CSS.
  Proof, a placeholder, then "hello", Enter, "world" with the line and character
  count following: [window](one-linux-native-multiline.png). `maxLength` is
  enforced in the buffer's `insert-text` handler, which keeps the part of an
  insert that fits; typing 21 characters into a 12 character field stops at 12:
  [window](one-linux-native-multiline-maxlength.png). `secureTextEntry` is not
  applied to the multiline field (iOS ignores it there too).

**M2 pointer continuation, 2026-10-24.** TESTED on studio-64's Ubuntu arm64
Lima VM with the release host, embedded bytecode, headless sway and a uinput
mouse: `onPointerDown`, `onPointerMove` and `onPointerUp` now use RN's own
`TouchEventEmitter` pointer path, alongside its existing touch path. Move
coalescing and listener dispatch remain in RN. Mouse down/up report `button: 0`;
move reports `button: -1`; buttons and pressure follow the primary button, and
keyboard modifiers come from GDK. A broken grab also sends pointer cancel.
The target is hit tested on each mouse event; local offsets still go through
`localPoint`, including transforms and scroll offsets.

The demo's drag region reports three real uinput moves, then up at local
`206,46`, `buttons: 0`, `button: 0`:
[drag](one-linux-native-drag.webp). The observation would be disproved by a
missing move, a release with buttons still set, or offsets in window space.
RAN: the incremental release host build, the Linux bundle and Hermes bytecode.
No automated tests were added. The primary mouse button remains the supported
press source; secondary buttons and touchscreen sequences remain unimplemented.

**M2 input colors, 2026-10-24.** TESTED in the same VM with the release
host and real keyboard input: `placeholderTextColor` colors the single-line
placeholder independently of typed text; `selectionColor` tints the caret in
both single-line and multiline fields, as on iOS. Independent `cursorColor`
is Android only in React Native. Its iOS JS path removes that prop before the
native view, so Linux does not add an adapter or patch RN to expose it.

The cause was read in [GTK 4.14.5's source](https://github.com/GNOME/gtk/blob/4.14.5/gtk/gtktext.c#L6952):
`gtk_text_set_attributes` copies the field's attributes to the placeholder.
The old foreground attribute therefore overrode its CSS color and every later
update replaced label attributes. Typed color now lives on the `text` CSS
node, and placeholder color on its own node. GTK's cursor snapshot reads
`caret-color` from the text style, so `selectionColor` supplies that property.
The existing CSS font and centered natural-baseline allocation are unchanged;
the now-unused foreground attribute helper is removed.

Proof: [placeholder and typed text](one-linux-native-input-baseline-colors.webp),
[caret detail](one-linux-native-input-caret-detail.webp). The same string's
glyphs occupy rows 255 through 272 in both raw captures. A moved baseline or
a caret that ignores selection color would disprove the claim. RAN: incremental
release host build, Linux bundle, Hermes bytecode, real key events and pixel
inspection. No automated tests were added.

**M3 initial controls, 2026-10-24.** TESTED in `tests/linux-basic` on the
studio-64 arm64 VM with the release host and embedded Linux bytecode. The Linux
namespace now has six controls including the existing Switch:

| API | GTK widget | proof |
| --- | --- | --- |
| `One.linux.Button` | `GtkButton` | [one press, disabled button unchanged](one-linux-native-button.webp) |
| `One.linux.SegmentedControl` | grouped `GtkToggleButton`s in a linked `GtkBox` | [selection](one-linux-native-segmented-control.webp) |
| `One.linux.Slider` | `GtkScale` | [three drag updates to 74 percent](one-linux-native-slider-progress.webp) |
| `One.linux.DropDown` | `GtkDropDown` with a `GtkStringList` | [popup](one-linux-native-dropdown-open.webp), [Beta selected by keyboard](one-linux-native-dropdown.webp) |
| `One.linux.ProgressBar` | `GtkProgressBar` | [fraction follows the slider](one-linux-native-slider-progress.webp) |

All five new Fabric components share the native value, revision and event
acknowledgement implementation in `OneLinuxControl`; the public wrappers use
`src/platform/controlled.ts`. Programmatic setters are guarded and never emit.
Button presses carry event counts too. Progress is read only. Selection uses
zero-based indices or -1 for no selection; dropdown labels are strings. Slider
`step` is the GTK keyboard increment. Each wrapper has a default box size that
can be overridden with `style`; it does not yet measure a themed intrinsic size.
The descriptors and JS specs stay under the Linux directories and outside iOS
and Android codegen. RN source is unchanged.

The native controls and RN text/rows share one `ScrollView`:
[scrolled composition](one-linux-native-controls-scroll-mixed.webp), offset 202.
The UI reported five native changes after a segment selection, three slider
moves and a dropdown selection. Rejecting a segment change acknowledged the
event and restored the accepted GTK selection after the hover settled:
[rejected change](one-linux-native-controls-rejected-settled.webp).
A revision reset restored segment 0, choice 0 and level 25 percent without
increasing the six native changes already reported:
[reset](one-linux-native-controls-reset.webp). A stale visual value, a change
from the disabled button or an event from that reset would disprove the claim.

RAN: incremental CMake release host build; the One package build and static
spec generation (six Linux specs, 30 mirrors); `one build --platform linux`;
Hermes bytecode compilation; source lint (14 files, zero warnings or errors);
real uinput mouse/keyboard interactions and native screenshots. No automated
tests were added. Images, transforms, hover and existing press behavior remain
visible in the same captures. No startup timing comparison was made under the
host's concurrent load.

**VM setup and compatibility checks, 2026-10-24.** RAN: both
`apt-daily.timer` and `apt-daily-upgrade.timer` are disabled and inactive in the
dev VM, and `lima-vm.sh` applies that policy after startup. The already-running
upgrade services were stopped through systemd with their process-only stop
policy, and the in-flight dpkg transaction was allowed to finish. Automatic
upgrades had started at boot while the VM reported 95 percent full I/O pressure;
this is a development VM policy, not a startup performance measurement.

TESTED after the pointer and control changes: the existing Switch still turns
on, the RN Pressable increments once, and moving over the text-cursor button
fires hover and changes the cursor. The same capture shows decoded images and
transformed RN content: [existing interactions](one-linux-native-existing-interactions.webp).

## Gaps

- M4 implements route titles, header visibility/back, Stack push/pop, controlled
  tab selection and a left sidebar. Custom header/toolbar composition, modal
  presentations, transition animations, tab icons and the remaining native-stack
  visual options are not implemented on GTK yet. Repeated primary mouse tab
  events were exercised; keyboard repeat activation, nested pop-to-top and
  scroll-to-top need broader interaction validation.
- Linux AppCommands supports menus, key bindings and Input predicates. The Mac
  toolbar configuration is omitted from its Linux public config and rejected
  by the native module. The window API opens another instance of the root;
  per-window initial routes and cross-window application state are not provided.
- Sway 1.9 lacks the popup reposition protocol used by GTK submenus. Menu
  interaction works with GTK's remapping warning visible and fatal criticals;
  GNOME Shell validation remains outside the headless VM proof.
- The requested shared Mac control/command code intentionally changes Mac JS
  modules. Mac's earlier zero-byte bundle expectation cannot be assumed for
  these requested shared-wrapper changes. The Mac runtime check of
  `tests/macos-basic` is recorded under "Mac check after the shared wrappers"
  above. s72425 and ci-manager own the iOS, Android and web byte comparisons;
  no wider byte result is claimed.
- M3's ten controls, theme-derived intrinsic sizing, Slider completion,
  indeterminate progress, tagged dropdown items and RN ScrollView composition
  have arm64 release VM proof. Slider touch and wheel completion paths have
  not been exercised. Both x86_64 and aarch64 now have core build and first
  content paint CI proof; x86_64 interactions and broader platform validation
  remain with CI.
- Pointer presses support the primary mouse button. Secondary mouse buttons
  and touchscreen sequences are not implemented.
- Text input still lacks capitalization hints, input method position hints
  and drag and drop. `cursorColor` is Android only in RN and is not a Linux gap.
- The earlier scroll, portal color scheme, image and Networking gaps remain.

**Next:** review 3 fixes are in. M5 is on hold by s72425 until told: the
prebuilt core (`prepare-core.sh`, `package-core.sh`) and `package-app.sh` for a
.deb and a Flatpak exist and install and launch in the VM
([deb](one-linux-native-m5-deb.webp), [flatpak](one-linux-native-m5-flatpak.webp));
the canary release job and the remaining packaging plan write-up remain. The
static ICU choice and both Linux architecture CI checks are recorded above.
M4's baseline shell and routing have release VM captures. Lead
s72425 and ci-manager own review, broader platform builds
and the release bundle byte gate. M5 packaging and the visual navigation options
listed above remain. The shared worktree stays held by s72425; owned VM services
are stopped at handoff.
