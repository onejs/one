import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  ssr: {
    noExternal: true
  },
  plugins: [
    one({
      web: {
        defaultRenderMode: 'ssg',
      },
    }),
  ],
})
