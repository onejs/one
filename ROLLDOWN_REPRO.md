# Rolldown SSR/SSG Production Build Issue

This branch demonstrates a production build issue with rolldown-vite when used with the One framework.

## Issue Summary

When building for production with rolldown-vite, the SSG (Static Site Generation) phase fails with React error #130:

```
Error: Minified React error #130; visit https://react.dev/errors/130?args[]=undefined&args[]=
```

This error means "Element type is invalid: expected a string (for built-in components) or a class/function (for composite components) but got: undefined."

## Root Cause

The issue appears to be related to rolldown's lazy module initialization pattern (`__esmMin`) and how it handles exports across chunks:

1. Rolldown uses `var __esmMin = (fn, res) => () => (fn && (res = fn(fn = 0)), res)` for lazy module initialization
2. Components like `Text_default` are declared as `var Text_default;` and assigned inside init functions
3. When chunks import from the entry before the init functions are called, the exports can be undefined
4. This violates ES module live binding semantics

## Steps to Reproduce

```bash
# Clone the repo and checkout this branch
git clone https://github.com/onejs/one.git
cd one
git checkout rolldown-web-support

# Install dependencies (this will use rolldown-vite@7.3.0 via resolutions)
yarn install

# Run the production test (will fail with React #130 error)
cd tests/test
yarn test:with-rolldown:prod
```

## What Works

Dev mode works correctly:

```bash
cd tests/test
yarn test:with-rolldown:dev
# All 62 tests pass
```

## What Fails

Production mode with SSG:

```bash
cd tests/test
yarn test:with-rolldown:prod
# Fails during SSG with React #130 error
```

## Attempted Fixes

These options were tried but did not resolve the issue:

1. `experimental.strictExecutionOrder: true` - Did not change output behavior
2. `inlineDynamicImports: true` - Did not resolve the issue
3. `minify: false` - React error still shows as #130 (React's prod format)

## Environment

- rolldown-vite: 7.3.0
- Node.js: v24.x
- Platform: macOS (Darwin)

## Related Issues

- https://github.com/rolldown/rolldown/issues/2655 (strictExecutionOrder bug)
- https://rolldown.rs/guide/in-depth/code-splitting (execution order docs)
