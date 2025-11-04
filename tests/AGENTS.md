---
applyTo: "tests/**/*"
---

# `./tests` Directory

The `./tests` folder contains utilities and apps for testing the One framework.

## Main Subdirectories

* `test` - the main test app, containing E2E tests for the One framework.
* `hmr` - a test app designated for testing HMR (Hot Module Replacement) functionality on different platforms.
* `rn-test-container` - a blank React Native app including all the native dependencies, being used as a "container" app to avoid the need to build a native app for every test app.

## Additional Notes

* You may see the use of `@vxrn/test`, which contains shared test utilities and setups. The package is located at `packages/test` under the monorepo root.
