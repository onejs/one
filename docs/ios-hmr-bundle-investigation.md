# iOS HMR bundle-load investigation

The dev rolldown job in main run 39427820580 failed at the first navigation in the second HMR test, before creating a route. Its saved UI showed React Native's development-server connection error. The saved server log had no bundle request, response-write or finish timestamps, and the native network error was not retained. Those artifacts cannot distinguish a build delay, idle connection, canceled stream or another network failure.

## Captured local runs

On October 20, 2026, the unchanged two-test sequence at source `9e5c22bbae61a8ffccc4c2008d6b77119ee495fc` passed on both air-32 and studio-64 under normal heavy admission. Both used the matching RNTestContainer built with React Native 0.88 and Hermes V1, Node 24.3.0, Appium 3.6.0, its XCUITest driver 12.5.0, and an iPhone 16 iOS 27 simulator. The container was built on air-32 with Xcode 27.0 and reused on studio-64.

The command was `bun run test-ios:rolldown:dev tests/hmr-fast-refresh.test.ios.ts` from `tests/test`. Assertions, retry settings and deadlines were unchanged.

| Host | Native bundle response 1 | Native bundle response 2 | Test result |
| --- | --- | --- | --- |
| air-32 | server finish at 4,587 ms | JSON status at 10,300 ms; server finish at 13,620 ms | 2 passed |
| studio-64 | server finish at 1,835 ms | server finish at 4,584 ms | 2 passed |

Each native response began its multipart stream within 1 ms and finished with status 200. The second request followed the first test's edits and restoration. Native unified logs and actual server request/write/finish logs were retained for both runs. This establishes successful local behavior; it does not explain the failing CI request or establish a runtime fix.

An earlier air-32 attempt stopped in global setup during SSR dependency loading, before either HMR test or a native bundle request. Its shell used Node 25.9.0. The successful run aligned Node with the repository's 24.3.0 requirement and built the test fixture's dependencies. That setup failure is separate from the reported CI failure.

## CI evidence needed

The dev rolldown lane now retains the native unified log for RNTestContainer and CFNetwork alongside bundle request, header, multipart-write, end, finish and close events. The fixture installs its tracing middleware only when `ONE_NATIVE_BUNDLE_TRACE` supplies an output path. No library response behavior changes.

A failing CI capture is still needed before choosing a runtime repair. Correlate the native network error with server writes and elapsed time. A successful capture alone cannot establish why earlier runs failed.
