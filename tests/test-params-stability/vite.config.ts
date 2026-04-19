import { one } from 'one/vite'
import type { UserConfig } from 'vite'

// mirrors soot: default render mode is spa
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
