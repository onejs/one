# Typed packages for Bun AoT

`bun compile` (Bun's `--compile --aot`) reads TypeScript types to give objects fixed layouts and drop guards. Published packages ship plain JavaScript, so it compiles them blind. This folder holds typed copies of npm's own production files: the code is npm's, byte for byte once the types are erased, with annotations added. A package built from here keeps npm's files and adds an `"aot"` export condition pointing at a `.aot.ts` twin, which Bun picks only under `--aot`.

Layout: `<name>/<version>/<path>.ts` is the typed copy of `<path>.js` in that npm version. The newest version of each package is the one built; older versions stay as the source of a port.

## Commands

```sh
# lay the types of one version onto a newer npm version, then type the leftover statements by hand
bun typed-packages/scripts/port.ts react-reconciler 0.33.0 0.34.0
# or onto another package's file that inlines the same code
bun typed-packages/scripts/port.ts react-reconciler@0.34.0:cjs/react-reconciler.production.ts react-native@0.88.0:Libraries/Renderer/implementations/ReactFabric-prod.js

# build dist/<name> for every package (erase-checks each typed file against npm's)
bun typed-packages/scripts/build.ts
# and lay the typed files and "aot" exports over matching installed versions in a project
bun typed-packages/scripts/build.ts --into path/to/node_modules

# compile the bench against npm and typed packages and time them in turn
BUN=path/to/bun-canary ROUNDS=20 typed-packages/bench/run.sh
# the same tree through react-native's Fabric renderer, over stand-ins for its native side
BUN=path/to/bun-canary ROUNDS=20 typed-packages/bench/run.sh fabric
```

Packages that ship their own TypeScript, listed in `sources.json` (`@tamagui/*`, `@react-navigation/*`), need no typed copy: `build.ts --into` writes `aot/` from each one's `src`, resolved for iOS (`.ios` over `.native` over the base file) with the listed defines inlined, and points an `aot` condition on each entry at it.

Typed files import typed packages by name, so Bun compiles those with their types as well. Every other import (react, react-native, untyped packages) reads the host bundle's own module through `globalThis.__vxrnBridge(id)`, so the app keeps one copy of each module. Each package lists those ids in `package.json` `"aotBridge"`. ESM imports and JSX reach the global through the generated `typed-packages-bridge` package, whose `define.js` sets the global from installed modules for programs with no host bundle, like the benches.

react-native's typed renderer is reached through `require('react-native/Libraries/Renderer/implementations/ReactFabric-prod')`, which gets its own `aot` export. The relative require in `Libraries/Renderer/shims/ReactFabric.js` does not go through exports, so a bundler has to leave the deep path external for Bun to see the types.

Check the types with `bun check --aot --no-script`, and confirm Bun uses them with `bun compile --explain=json`: entries for `*.aot.ts` files show they were read.

## Provenance

- `react-reconciler/0.33.0`: Jarred's typed file from bun commit `1ac963400e` (`packages/full-types/react-reconciler/0.33.0`), unchanged.
- `react-reconciler/0.34.0`: ported from 0.33.0 with `port.ts` (148 changed regions, 104 re-typed), then the rest typed by hand.
- `react/19.3.1`: typed here by hand.
- `react-native/0.88.0`: the reconciler 0.34.0 types laid over `ReactFabric-prod.js` with `port.ts`; Fabric's own event and host code is mostly untyped.

The other route is converting React's Flow sources to TypeScript and building them, which gives types for every version at once but produces different code from npm's.
