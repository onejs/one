// Shared setup file that runs before app initializes
// This sets a global variable that tests can check to verify setupFile ran
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

declare global {
  var __setupFileRan: {
    client?: boolean
    server?: boolean
    native?: boolean
  }
}

globalThis.__setupFileRan = globalThis.__setupFileRan || {}

// Determine which environment we're in
if (typeof window !== 'undefined') {
  // Client-side (web browser)
  globalThis.__setupFileRan.client = true
  console.log('[setup.ts] Client setup file ran')
} else if (typeof process !== 'undefined' && process.env?.VITE_ENVIRONMENT === 'ssr') {
  // Server-side
  globalThis.__setupFileRan.server = true
  console.log('[setup.ts] Server setup file ran')

  if (process.env.ONE_RENDER_MODE === 'ssg') {
    writeFileSync(
      fileURLToPath(new URL('./setup-file-ssg-ran.txt', import.meta.url).toString()),
      'setup file ran during ssg build'
    )
  }
}
