import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

// rolldown's allocator otherwise keeps large arenas resident after prebundling.
// initialize its binding with direct allocations, then restore the environment
// before user config and child commands run (bun has its own allocator).
export async function initializeDevAllocator() {
  const options = {
    MIMALLOC_DISALLOW_ARENA_ALLOC: '1',
    MIMALLOC_PURGE_DELAY: '0',
  }
  const previous = new Map(Object.keys(options).map((key) => [key, process.env[key]]))
  for (const [key, value] of Object.entries(options)) process.env[key] ??= value

  try {
    const requireFromVite = createRequire(import.meta.resolve('vite'))
    await import(pathToFileURL(requireFromVite.resolve('rolldown')).href)
  } finally {
    for (const [key, value] of previous) {
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
  }
}
