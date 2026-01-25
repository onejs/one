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
        // match production settings that may cause hydration issues
        experimental_scriptLoading: 'after-lcp-aggressive',
      },
    }),
  ],
  define: {
    // disable strict mode to test re-renders
    'process.env.ONE_DISABLE_STRICT_MODE': JSON.stringify('true'),
  },
  build: {
    // use development mode to get better error messages
    minify: false,
  },
} satisfies UserConfig
