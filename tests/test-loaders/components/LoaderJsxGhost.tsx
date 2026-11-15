// simulates an island from a newer server build: tagged with a client id but never
// registered on the client (no 'use client' directive), so revival must fall back
export function Ghost() {
  return null
}
;(Ghost as any).__oneClientId = 'components/LoaderJsxGhost.tsx#Ghost'
