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

## Current Status
- Build cache was stale - fixed by changing cache key to v2
- Hermes compilation and re-signing ARE working in CI
- App is STILL CRASHING at launch despite correct bytecode format
- Error: "Cannot launch dev.onestack.rntestcontainer application"
- Need to investigate WHY the app crashes at runtime

## CI Runs
- Build ID: 20110602613 (cache fix applied, builds succeeded, tests still fail)
- Hermes compiles successfully, re-signing happens
- App crashes immediately when Appium tries to launch it

## Next Investigation
- Check if there's a Hermes version mismatch between app binary and bundle
- Look at simulator logs for actual crash reason
- Compare working local environment vs CI environment
