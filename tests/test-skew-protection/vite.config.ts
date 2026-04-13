import { one } from 'one/vite'
import type { UserConfig } from 'vite'

// skew protection only runs in production builds
export default {
  plugins: [
    one({
      config: {
        tsConfigPaths: {
          ignoreConfigErrors: true,
        },
      },
      web: {
        defaultRenderMode: 'spa',
        skewProtection: true,
      },
    }),
  ],
} satisfies UserConfig
