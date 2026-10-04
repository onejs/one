# Native module handoff

Review: m19584, assembled once. Kotlin parity and assigned runtime proofs complete.
The namespace move landed before the manager's takeover mail; no further namespace work follows that handoff.

RAN: landed on One v2-beta, main untouched:
- `119b9687b7412440d70924bafa71b83eb1f76edb`: Kotlin Nitro FileSystem, ImageManipulator, Motion; shared generated C++ contracts; hardware-fastest motion requests and fixed timestamp anchor.
- `55f9c32072b4722ac56f91833f28ecf4bc4b3931`: separate approved root namespace migration, callers, docs, unavailable behavior and drift/coverage checks.

One branch: `fix/one-uniform-services-final`.
Contrast branch: `fix/one-native-uniform-final`, `4390d6d11384848439f63479795f70d2ba721610`. Shell caller updated; template references already address iOS view mappings.

TESTED: Android API37 emulator and iOS27.0 standard simulator (SDK27.1), public root FileSystem/ImageManipulator/Motion contracts, exact decomposed filename and listed-URI roundtrip, native error cases, all eight EXIF orientations, independently decoded pixels/transparency and a rejected wrong-rotation negative control. Android seeded sensor vectors, concurrent subscription intervals/removal, and 68 operations across 24 unavailable service namespaces passed. Both captures inspected. Native source pin `3e4ba9152`; six implementation files match the built revision byte for byte. Reports/receipts: `tests/native-features/evidence/uniform-native-modules/{android,ios}`.

RAN: compiler rebuilt; vxrn 258/258 at `3b3e99560^` and `69591350d`. Reported engine failures were not reproduced; no engine fix or loosened test. Evidence: `tests/native-features/evidence/native-modules/engine`.
RAN: final One build, public fixture typecheck, 126 SSR/docs/type-drift/coverage tests. Full `bun release --into` rebuilt 17 packages from `55f9c3207` into isolated Contrast; installed declarations/JavaScript matched built bytes; shell tsc passed. No speed benchmarks.

Moved namespaces: Widgets, LiveActivities, LocalAuthentication, ProtectedStore, KeepAwake, Print, StoreReview, QuickActions, Location, FileSystem, Audio, Share, PhotoLibrary, MapServices, AppTracking, AppIcon, ScreenOrientation, ScreenCapture, Purchases, ImageManipulator, Device, Motion, BackgroundTasks, AppIntents, DeviceAttestation, Contacts, Calendar.

Gaps/open items: all 27 lack generated exact service/framework namespaces under One.iOS; existing related generated SwiftUI views remain. No new iOS wrapper or uniform alias was added. Physical iOS motion readings remain unproven; the simulator has no sensors. Manager owns assembled review and automatic Release/CI watch. Contrast main needs a published One family containing the root API and its dependency pin; its current beta pin predates this API. Primary One fast-forward refused local modifications to the three native module spec declarations, which were left untouched.

Released own emulator5592, iOS lease, proof servers and isolated MCP daemons. Remote iOS worktree removed. Clean pushed worktrees retained for review: `~/.worktrees/one-android-modules` and `~/.worktrees/contrast-one-native-uniform`. Details: `plans/one-native-uniform-services.md`.
