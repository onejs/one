import type { UserConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'
import { vxs } from 'vxs/vite'

export default {
  define: {
    REPLICACHE_VERSION: '"15.2.1"',
    ZERO_VERSION: '"0.0.0"',
    TESTING: 'false',
  },

  plugins: [
    tsconfigPaths({
      projects: [
        'tsconfig.json',
        '/Users/n8/github/mono/tsconfig.json',
        '/Users/n8/github/mono/packages/replicache/tsconfig.json',
      ],
    }),

    vxs({
      app: {
        key: 'One',
      },

      deps: {
        replicache: true,
      },
    }),
  ],
} satisfies UserConfig
