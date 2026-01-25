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
        deploy: 'vercel',
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
  server: {
    port: 3333,
  },
  preview: {
    port: 3333,
  },
} satisfies UserConfig
