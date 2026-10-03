# Native speed fixture host

Parked at the owner’s request. RAN: production JavaScript bundling and host
TypeScript checks passed; Android compiled One C++ and Kotlin. Native packaging,
runtime contracts and all measurements remain incomplete. This branch is a
save point, not a validated implementation. Build diagnostics and source hashes
are retained in `../proofs/native-speed/parked-*`. Before timing, review whether
the Expo file stat adapter requests the same metadata as One and Nitro FS.

This host links One and the rivals into the same Release app. The workload
functions remain in the existing `../fixtures/one-native-*.tsx` files. Expo is
used here to link the Expo rivals; normal native-features prebuild stays bare.

Register the checkout with `cd packages/one && bun link`, then install here
with `bun install`, then `bun run prepare-run` to record the source revision
and hashes before building. Run `bun run prebuild`, `pod install --project-directory=ios`,
and build the OneNativeSpeed scheme in Release. Build Android with
`android/gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a`.
Use `bun heavy` for native builds and an exclusive measurement window for runs.

Start the result server with `bun ../scripts/native-speed-server.ts <output>`.
The default app run uses `run-config.json`. A cold launch with
`one-native-speed://run?suite=storage&device=iphone-air&server=http://HOST:4399`
selects a suite and server without rebuilding. Suites: storage, crypto,
filesystem, fetch, image, motion, all. The contracts suite mounts the existing
FileSystem, image and Motion lifecycle fixtures for native validation. `device` labels results; it must contain
only lowercase letters, digits and hyphens. Run only a Release binary; the
fixture rejects development bundles.

Each suite has seven counterbalanced runs. Every completed sample is uploaded
before starting the next workload, and all raw values are retained. Async
operations record individual-call latency in milliseconds. Storage and crypto
record microseconds per call in batches of 100; their p95 is the distribution
of batch averages. Timing excludes assertions and cleanup. The first measured
run stays in the data. No warmed samples are discarded.

FileSystem uses UTF-8 writes of 4 KB, file stats and 1 MB copies. The existing
API has no read operation, so no read-speed claim is made. Image transforms use
the checked-in 12 MP photograph, resize to 1000 × 750 and encode JPEG or PNG.
Streaming fetch checks all fixed-size frames and byte counts; it reports first
byte, throughput and frame lag relative to the first arrival against server
emission times. Motion uses accelerometer subscriptions at 60 Hz and the native
maximum request, and records native timestamps, delivered rate and shared
handler cost. An unavailable sensor is recorded rather than substituted with
synthetic callbacks. Live iOS frequency measurements require physical hardware.


The react-native-sensors 7.3.6 patch only updates its Gradle repository, Android
gradle plugin, namespace and React dependency for the current Android build.
Its sensor registration, filtering, event emission and JavaScript code are
unchanged. The workload never compensates for a slower implementation.
