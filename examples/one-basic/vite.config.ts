import { defineConfig } from 'vite'
import { vxs } from 'vxs/vite'

export default defineConfig({
  plugins: [
    vxs({
      web: {
        defaultRenderMode: 'ssg',
      },
    }),
  ],
})
