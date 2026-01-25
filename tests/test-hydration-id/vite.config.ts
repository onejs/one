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
        // use ssg as default to test hydration
        defaultRenderMode: 'ssg',
      },
    }),
  ],
  define: {
    // disable strict mode to isolate hydration issues
    'process.env.ONE_DISABLE_STRICT_MODE': JSON.stringify('true'),
  },
  build: {
    // use development mode to get better error messages
    minify: false,
  },
} satisfies UserConfig
