# Windows core (M0)

The first milestone of the Windows plan: the unforked React Native 0.88 C++
core, its pinned dependencies and Hermes compile on Windows, and a headless
smoke runs a bundle and lays out a Fabric tree. There is no window yet.

- `scripts/build-core.ps1` builds everything into the user cache from an x64
  Visual Studio developer shell, with `CC` and `CXX` naming clang-cl and
  `RN_ROOT` naming the installed react-native.
- `cpp/deps` builds folly, glog, fmt, double-conversion and fast_float.
- `cpp` builds the core from the shared `native-core/rn-core.cmake` unit list
  and host runtime, plus `smoke/main.cpp`.
- `smoke/smoke.js` builds a tree through `nativeFabricUIManager` the way
  React's Fabric renderer does; `main.cpp` runs it as Hermes bytecode on the
  shared `OneHostRuntime` and checks the frames Yoga laid out in the mounting
  transaction.
- `.github/workflows/windows-core.yml` runs it on GitHub's `windows-2025`
  runner and uploads the logs, smoke output, binaries and their hashes.

## Result

The core and the smoke pass on the runner:

- RN 0.88.0 (the registry tarball `bun.lock` pins), Hermes 260318099.0.4,
  boost 1.83.0, double-conversion 1.1.6, fast_float 8.0.0, fmt 12.1.0,
  folly 2024.11.18.00, glog 0.3.5.
- clang-cl 22.1.3 with the MSVC 14.51 STL and Windows SDK 10.0.26100, from
  Visual Studio 18.11.
- All 311 units of the shared list compile with no RN source edits and one
  warning (`strerror` is deprecated in the MSVC runtime).
- The smoke evaluates bytecode, mounts the four views with the frames Yoga
  should give them, and fails on a bundle with a different layout or on
  JavaScript source.

Findings:

- `rn-core.cmake` drops every `*Windows.cpp` unit. On Windows,
  `oscompat/OSCompatWindows.cpp` is the only implementation of oscompat, so
  this target adds it back. The shared list could keep it, since it compiles
  to nothing elsewhere.
- Hermes at this tag does not build with clang-cl: its CMake adds
  `-Werror=undef` for clang-cl, and llvh's `Compiler.h` and `MathExtras.h`
  test `#if __GNUC__`. Hermes builds with `cl` here, as in its own Windows CI.
  The fix upstream would be `#if defined(__GNUC__) && __GNUC__`, or skipping
  `hermes_enable_werror_undef` under `CLANG_CL`.
- glog 0.3.5's CMake exports its private `src` directory, whose `demangle.h`
  folly takes for libiberty's. The deps build exposes only glog's public
  headers.
- folly compiles the list react-native's Android build uses plus folly's own
  Windows portability units, without that build's POSIX and libc++ flags.

The shared native-core comes from onejs/one `d35f3f285dde` on
`tm/one-linux-native`, checked out read only, until it lands on main; then
`NATIVE_CORE` defaults to `../native-core`.
