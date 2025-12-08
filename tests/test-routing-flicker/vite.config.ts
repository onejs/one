import { one } from 'one/vite'
import type { UserConfig } from 'vite'

// DEFAULT_RENDER_MODE can be 'spa', 'ssg', or 'ssr'
// This allows testing the same app with different default render modes
const defaultRenderMode = (process.env.DEFAULT_RENDER_MODE as 'spa' | 'ssg' | 'ssr') || 'spa'

console.info(`[test-routing-flicker] Using defaultRenderMode: ${defaultRenderMode}`)

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
