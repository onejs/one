import { one } from 'one/vite'
import type { UserConfig } from 'vite'

// models sootsim.com prod: spa default render mode, root layout is +ssg
export default {
  plugins: [
    one({
      web: {
        defaultRenderMode: 'spa',
      },
    }),
  ],
} satisfies UserConfig
