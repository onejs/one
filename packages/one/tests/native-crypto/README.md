# Native crypto digest probe

This iOS app embeds the Hermes framework shipped with the native-features
fixture, links real Nitro C++ sources and OneCrypto, and bundles the actual
`index.native.ts` entry. Its test-only `require` returns the real installed
NitroModulesProxy, without loading the unrelated React Native JS application.
The runtime enables the microtask queue used by bridgeless React Native. No
crypto implementation is mocked. Run it on a claimed simulator.

From the repo root, with native-features pods and dependencies installed:

```sh
python3 packages/one/tests/native-crypto/build.py /tmp/one-crypto-probe
xcodebuildmcp simulator install --simulator-id "$CRYPTO_SIMULATOR" --app-path /tmp/one-crypto-probe/OneCryptoProbe.app
xcodebuildmcp simulator launch-app --simulator-id "$CRYPTO_SIMULATOR" --bundle-id dev.onejs.crypto-probe
```

`ONE_CRYPTO_SOURCE_ROOT` chooses the source checkout and
`ONE_CRYPTO_DEPENDENCIES_ROOT` chooses the checkout containing installed
Nitro/React Native dependencies and the shipped Hermes framework. Both default
to this checkout. This permits building the small probe on a shared builder.
The app writes `Documents/result.json` in its data container; inspect it with
`xcrun simctl get_app_container "$CRYPTO_SIMULATOR" dev.onejs.crypto-probe data`.
Any `failed` result fails the probe. Expected success has 47 passed checks.

RAN baseline on iOS 27 iPhone 16 3, Hermes 250829098.0.17, Nitro 0.37.0,
source d5175fa0e: digest undefined, synchronous TypeError for SHA-256. The
baseline entry retained secure random but lacked subtle.

TESTED fixed on that simulator with the same Hermes framework: all 47 checks
passed, including SHA-1/256/384/512 known vectors through ArrayBuffer,
Uint8Array slices and DataView slices, caller mutation after invocation,
empty input, a million-byte SHA-256 vector, Promise errors, native invalid
ranges, repeat installation, and unchanged secure random APIs. Sixteen
concurrent million-byte digests completed in 66ms in this smoke run; this is
not an isolated performance benchmark. Raw results are in `evidence/`.

RAN Android arm64 compilation of HybridOneCrypto.cpp and its generated
HybridOneCryptoSpec.cpp using NDK 27.1.12297006, fbjni 0.7.0, installed Nitro
0.37.0 and React Native JSI headers. The existing native-features CMake command
was reused with source/include paths pointing to the task checkout and
objects written outside shared build outputs. No Android runtime claim.

RAN focused Vitest: 11 tests pass across crypto.test.ts and digest.test.ts.
RAN focused TypeScript: tsc --ignoreConfig --noEmit --skipLibCheck --target
es2020 --module esnext --moduleResolution bundler --lib es2020,dom, covering
crypto/digest.ts, random.ts, and index.native.ts.

The production source snapshots the exact input range on the calling JS
thread and hashes on Nitro's existing worker pool. CommonCrypto streams on
iOS; Android streams through java.security.MessageDigest with a bounded 64KiB
Java temporary. The JS wrapper exposes only global crypto.subtle.digest,
keeps existing crypto/subtle methods, and normalizes standard SHA names.
Hermes errors carry standard rejection names because it lacks DOMException.
Native binary rebuilds are required for the new private hybrid method;
installing JS alone cannot add digest to an older binary. Consumer Home
acceptance belongs to its owning lane and was not run here.
