import type { BetterAuthClientPlugin } from 'better-auth'

export function platformClient() {
  return { id: 'platform' } satisfies BetterAuthClientPlugin
}
