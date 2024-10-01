import WebSocket from 'ws'

// make websockets work on server
globalThis['WebSocket'] ||= WebSocket as any

globalThis['requestAnimationFrame'] = setTimeout
