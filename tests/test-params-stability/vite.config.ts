import { one } from 'one/vite'
import type { UserConfig } from 'vite'

// mirrors contrast: default render mode is spa
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
