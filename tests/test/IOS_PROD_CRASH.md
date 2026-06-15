# iOS prod (Release/Hermes) launch crash — root cause

Status: **open, quarantined** in `.github/workflows/test-native-ios.yml`
(prod matrix entries are `continue-on-error`). dev tests pass and stay gating.

## Symptom

The Release build of `rn-test-container` (Hermes bytecode bundle) **crashes on
launch, before any test runs**. Under Appium this surfaces as
`The application under test ... is not running, possibly crashed`. It had been
silently burning the whole 45-min job budget and showing up as a **cancelled**
run (looks like infra flake) on every `main` push. The test harness now fails
these jobs fast (~10m) — see "Harness change" below.

This is **not** a bytecode version mismatch. In CI the v98 bundle loads fine
(`ReactInstance: evaluateJavaScript() with JS bundle` runs, MMKV initializes),
then the process dies. (A local repro can hit a *separate* "Wrong bytecode
version. Expected 96 but got 98" error if you compile the bundle with a hermesc
whose version doesn't match the app's Hermes — that's a stale-local-env artifact,
not this bug.)

## Root cause — concurrent Hermes access (SIGSEGV)

From the simulator crash report (`SIGSEGV` / `EXC_BAD_ACCESS` at `0x12`):

- Crashed thread = `com.meta.react.turbomodulemanager.queue`:
  ```
  _dispatch_lane_serial_drain
  → ObjCTurboModule::performVoidMethodInvocation
  → TurboModuleConvertUtils::convertNSExceptionToJSError(jsi::Runtime&, NSException*, ...)
  → jsi::Object::setProperty → HermesRuntimeImpl::setPropertyValue
  → hermes putComputedWithReceiver_RJS → addOwnProperty → raisePlaceholder
  → JSError::setMessage → toString_RJS → HiddenClass::findProperty   ← SIGSEGV
  ```
- At the same instant the JS thread (`com.facebook.react.runtime.JavaScript`)
  is also executing in Hermes (`hermes::vm::objectAssign` → putComputed…).

Two threads are inside the **single-threaded** Hermes VM at once → heap
corruption → segfault.

Chain of events:
1. During startup a **TurboModule void method throws an Obj-C `NSException`**
   (occurs right after `react-native-mmkv` creates its instance — note the
   logged `Path:` is empty).
2. RN's `ObjCTurboModule::performVoidMethodInvocation` catches it and calls
   `convertNSExceptionToJSError`, which **builds a JS Error object via the
   Hermes `jsi::Runtime` on the TurboModule method queue thread**, not the JS
   thread, with no synchronization against the running JS thread.
3. Concurrent Hermes mutation → SIGSEGV.

The proximate bug is upstream **React Native** (off-JS-thread Hermes access in
the ObjC TurboModule exception path). The trigger is whichever native module's
void method raises during init.

## Reproduce locally

```sh
cd tests/test
export SIMULATOR_UDID=<booted iOS 18 iPhone 16 Pro udid>
export IOS_TEST_CONTAINER_PATH_PROD=<path to a Release RNTestContainer.app>
# use a hermesc whose bytecode version matches the app's Hermes runtime
export HERMESC_PATH=<matching hermesc>
TEST_ONLY=prod TEST_ENV=prod npx vitest --config ./vitest.config.ios.ts --run basic.test.ios
```

The harness relaunches the crashed app with `--console-pty` and dumps the
newest `~/Library/Logs/DiagnosticReports/RNTestContainer-*.ips` so the failure
is self-explaining. (Debugger attach to the sim app is blocked in the sandboxed
CI/dev environment, so the `.ips` crash report is the primary signal.)

## Fix direction (unresolved)

1. Stop the native module from throwing during init (treats the trigger), or
2. Patch RN's `ObjCTurboModule` exception path to marshal
   `convertNSExceptionToJSError` onto the JS thread (fixes the real bug;
   upstream or via patch-package).

## Harness change (done)

`packages/test/src/utils/appium.ts`: `createSession` no longer retries an
`AppCrashedError` (a crash-on-launch is deterministic), and a filesystem
circuit breaker fails every subsequent session in the run instantly once the
app is confirmed to crash — so a crashing prod build fails fast and honestly
instead of cancelling at the 45-min timeout.
