import { defineConfig } from 'vite'
import { vxrn } from 'vxrn/vite-plugin'

export default defineConfig({
  plugins: [vxrn()],
})
