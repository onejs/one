import { one } from 'one/vite'
import type { UserConfig } from 'vite'

export default {
  plugins: [
    one({
      config: {
        tsConfigPaths: {
          ignoreConfigErrors: true,
        },
      },
      web: {
        // render root layout for SPA pages to test layout render modes
        renderRootLayout: 'always-ssr',
      },
    }),
  ],
} satisfies UserConfig
