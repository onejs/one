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
- Waiting for fresh Release build in CI (app.json change invalidates cache)
- Build ID: 20110177510
