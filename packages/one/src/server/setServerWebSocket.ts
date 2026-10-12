import WebSocket from 'ws'

// node-only: ws needs Buffer and node streams at import, so the headless and
// edge worker entries, which share setServerGlobals, must never import it
export function setServerWebSocket() {
  globalThis['WebSocket'] ||= WebSocket as any
}
