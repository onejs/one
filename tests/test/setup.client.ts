// Client-side setup file that runs before app initializes in the browser
// This sets a global variable that tests can check to verify setupFile ran

declare global {
  var __setupFileRan: {
    client?: boolean
    server?: boolean
    native?: boolean
  }
}

globalThis.__setupFileRan = globalThis.__setupFileRan || {}
globalThis.__setupFileRan.client = true

console.log('[setup.client.ts] Client setup file ran')
