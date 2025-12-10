# iOS Prod Tests Fix - Session Notes

## Problem
iOS Prod tests have been failing since Expo 54/RN 0.81 upgrade (Nov 3rd)

## Root Cause Analysis

### Issue 1: Hermes Bytecode
- Release build is compiled with Hermes enabled, expects HBC bytecode format
- Our test was generating plain JS bundles → instant crash
- **Fix**: Added `hermesc -emit-binary` compilation step

### Issue 2: Code Signing
- Modifying main.jsbundle invalidates the app's code signature
- **Fix**: Added `codesign --force --sign -` after bundle replacement

### Issue 3: Cache Staleness (Investigating)
- Local tests pass, CI fails
- Suspecting the cached Release app was built with different Hermes version
- **Attempted Fix**: Added cacheBuster to app.json to force fresh build

## Test Results

### Local
- All iOS Prod tests PASS
- Re-signing shows: "replacing existing signature"
- App launches and tests complete successfully

### CI
- Dev tests: PASS (both Metro and non-Metro)
- Prod tests: FAIL (both Metro and non-Metro)
- Error: "Cannot launch dev.onestack.rntestcontainer application"
- Re-signing IS happening in logs
- Hermes compilation IS happening in logs

## Key Files Modified
- `packages/test/src/internal-utils/ios.ts` - Added Hermes compile + re-sign
- `tests/rn-test-container/app.json` - Cache buster

## Current Status - FIXED!
All iOS Prod tests are now passing in CI.

## Root Cause
The cached iOS app binary was built with an older Hermes version before the RN 0.81 migration. Even though the test was compiling the JS bundle with the correct hermesc (HBC bytecode v96), the app binary had an incompatible Hermes engine.

## Final Fixes Applied
1. Added Hermes bytecode compilation (`hermesc -emit-binary`) - `packages/test/src/internal-utils/ios.ts`
2. Added app re-signing after bundle replacement (`codesign --force --sign -`) - same file
3. Invalidated stale build directory cache by adding `-v2` to cache key - `.github/workflows/build-ios-test-container-app.yml`
4. Invalidated stale built app cache by adding `-v2` to cache key - same file

## CI Runs
- Build ID: 20111397047 - ALL TESTS PASSED!
