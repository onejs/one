#!/usr/bin/env node

// before cli-dev-memory and cli, which load rolldown. matches checkNodeVersion.ts.
const [major, minor] = process.versions.node.split('.').map((part) => Number(part))
if (!((major === 20 && minor >= 19) || (major === 22 && minor >= 12) || major > 22)) {
  console.error('One requires Node ^20.19.0 || >=22.12.0')
  process.exit(1)
}

if (process.argv[2] === 'dev') {
  const { initializeDevAllocator } = await import('./dist/esm/cli-dev-memory.mjs')
  await initializeDevAllocator()
}
await import('./dist/esm/cli.mjs')
