import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [one({ native: { bundler: 'metro' } })],
})
