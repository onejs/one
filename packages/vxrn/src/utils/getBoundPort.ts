import type { ViteDevServer } from 'vite'

// the port vite actually bound to. server.config.server.port can be undefined or stale
// and silently fall back to 8081, which makes the native bundle's serverUrl (and the
// simulator open target) point at the wrong port when the dev server lands elsewhere
// (e.g. 8081 taken -> 8082). once the http server is listening, address().port is the
// real bound port resolved by getServerOptionsFilled.
export function getBoundPort(server: ViteDevServer): number {
  const addr = server.httpServer?.address()
  if (addr && typeof addr === 'object' && typeof addr.port === 'number') {
    return addr.port
  }
  return server.config.server.port ?? 8081
}
