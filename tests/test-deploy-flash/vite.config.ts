import { one } from 'one/vite'
import type { UserConfig } from 'vite'

// mirrors contrast: spa default render mode, root layout is +ssg
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
      },
    }),
  ],
} satisfies UserConfig
