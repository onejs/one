import { one } from 'one/vite'
import type { UserConfig } from 'vite'

const defaultRenderMode =
  (process.env.DEFAULT_RENDER_MODE as 'spa' | 'ssg' | 'ssr') || 'ssg'

console.info(`[test-route-loading-config] Using defaultRenderMode: ${defaultRenderMode}`)

export default {
  plugins: [
    one({
      config: {
        tsConfigPaths: {
          ignoreConfigErrors: true,
        },
      },
      web: {
        defaultRenderMode,
      },
    }),
  ],
} satisfies UserConfig
