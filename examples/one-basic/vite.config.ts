import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one({
      web: {
        defaultRenderMode: 'ssg',
      },

      ...(process.env.TEST_METRO && {
        native: {
          bundler: 'metro',
        },
      }),
    }),
  ],
})
