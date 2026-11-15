# Typed packages for Bun AoT

`bun compile` (Bun's `--compile --aot`) reads TypeScript types to give objects fixed layouts and drop guards. Published packages ship plain JavaScript, so it compiles them blind. This folder holds typed copies of npm's own production files: the code is npm's, byte for byte once the types are erased, with annotations added. A package built from here keeps npm's files and adds an `"aot"` export condition pointing at a `.aot.ts` twin, which Bun picks only under `--aot`.

Layout: `<name>/<version>/<path>.ts` is the typed copy of `<path>.js` in that npm version. The newest version of each package is the one built; older versions stay as the source of a port.

## Commands

```sh
# lay the types of one version onto a newer npm version, then type the leftover regions by hand
bun typed-packages/scripts/port.ts react-reconciler 0.33.0 0.34.0

# build dist/<name> for every package (erase-checks each typed file against npm's)
bun typed-packages/scripts/build.ts
# and replace matching installed versions in a project
bun typed-packages/scripts/build.ts --into path/to/node_modules

# compile the bench against npm and typed packages and time them in turn
BUN=path/to/bun-canary ROUNDS=20 typed-packages/bench/run.sh
```

Check the types with `bun check --aot --no-script`, and confirm Bun uses them with `bun compile --explain=json`: entries for `*.aot.ts` files show they were read.

## Provenance

- `react-reconciler/0.33.0`: Jarred's typed file from bun commit `1ac963400e` (`packages/full-types/react-reconciler/0.33.0`), unchanged.
- `react-reconciler/0.34.0`: ported from 0.33.0 with `port.ts` (148 changed regions, 104 re-typed), then the rest typed by hand.
- `react/19.3.1`: typed here by hand.

The other route is converting React's Flow sources to TypeScript and building them, which gives types for every version at once but produces different code from npm's.
