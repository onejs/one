#!/usr/bin/env node

if (process.argv[2] === 'dev') {
  const { initializeDevAllocator } = await import('./dist/esm/cli-dev-memory.mjs')
  await initializeDevAllocator()
}
await import('./dist/esm/cli.mjs')
