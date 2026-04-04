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

if (process.env.ONE_RENDER_MODE === 'ssg') {
  writeFileSync(
    fileURLToPath(new URL('./setup-file-ssg-ran.txt', import.meta.url).toString()),
    'setup file ran during ssg build'
  )
}
