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
      react: {
        compiler: true,
      },
      web: {
        // use ssg as default to test hydration
        defaultRenderMode: 'ssg',
      },
    }),
  ],
  build: {
    // use development mode to get better error messages
    minify: false,
  },
  define: {
    // disable strict mode to test re-renders
    'process.env.ONE_DISABLE_STRICT_MODE': JSON.stringify('true'),
  },
} satisfies UserConfig
