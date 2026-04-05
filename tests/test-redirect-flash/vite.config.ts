import { one } from 'one/vite'
import type { UserConfig } from 'vite'

// mirrors soot: spa default, parent layout reads usePathname
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
