import type { BetterAuthClientPlugin } from 'better-auth'
import { SERVER_URL } from '~/constants/urls'

export function platformClient() {
  return {
    id: 'platform',
    fetchPlugins: [
      {
        id: 'native-origin',
        name: 'native-origin',
        hooks: {
          onRequest(context) {
            context.headers.set('Origin', SERVER_URL)
          },
        },
      },
    ],
  } satisfies BetterAuthClientPlugin
}
