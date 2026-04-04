// Server-side setup file that runs before app initializes on the server
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
globalThis.__setupFileRan.server = true

console.log('[setup.server.ts] Server setup file ran')

// sentinel for build.test.ts to detect if this file ran during the prod SSG
// build. gated on NODE_ENV=production so dev-mode re-evaluations (vite's
// ModuleRunner re-evaluates top-level code on many requests) can't touch it.
if (process.env.NODE_ENV === 'production' && process.env.ONE_RENDER_MODE === 'ssg') {
  writeFileSync(
    fileURLToPath(new URL('./setup-file-ssg-ran.txt', import.meta.url).toString()),
    'setup file ran during ssg build'
  )
}
