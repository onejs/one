import { hostname } from 'node:os'

const SERVER_ONLY_MARKER = 'loader-jsx-server-only-marker-7d51'

export function getServerSignal() {
  // only the derived count crosses the wire; the marker and node import must not
  return hostname().length + SERVER_ONLY_MARKER.length
}
