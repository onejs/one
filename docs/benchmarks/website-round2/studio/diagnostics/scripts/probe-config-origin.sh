#!/usr/bin/env bash
set -euo pipefail
root="$PWD/.build/website-round2"
file="$root/one/node_modules/@tamagui/web/dist/esm/config.mjs"
original="$root/evidence/context-bridge/config.original.mjs"
cp "$file" "$original"
trap 'cp "$original" "$file"' EXIT
node --input-type=module - "$file" <<'NODE'
import {readFileSync,writeFileSync} from 'node:fs'
import assert from 'node:assert/strict'
const file=process.argv[2], source=readFileSync(file,'utf8')
const needle='globalThis.__tamaguiPendingCheck = true;'
assert.equal(source.split(needle).length,2)
const diagnostic = ' console.warn("CONFIG_ORIGIN", JSON.stringify({ moduleUrl: import.meta.url, webResolved: process.getBuiltinModule("module").createRequire(import.meta.url).resolve("@tamagui/web"), webResolvedFromFixture: process.getBuiltinModule("module").createRequire(process.cwd()+"/package.json").resolve("@tamagui/web"), globalConfigPresent: !!globalThis.__tamaguiConfig }), new Error("first global config read").stack);'
writeFileSync(file,source.replace(needle,needle+diagnostic))
NODE
ONE_ROUND2_DIAGNOSTIC=1 ONE_ROUND2_CONTEXT_BRIDGE=da7865e5f node "$root/confirm-vendor-memory.mjs" control "${1:-1}"
