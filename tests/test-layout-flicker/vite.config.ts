import { one } from 'one/vite'
import type { UserConfig } from 'vite'

// matches takeout: default is spa, landing/docs are +ssg
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
