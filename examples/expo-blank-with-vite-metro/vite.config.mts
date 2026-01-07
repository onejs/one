import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { defineConfig } from 'vite'
import { expoManifestRequestHandlerPlugin, metroPlugin } from '@vxrn/vite-plugin-metro'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  root: __dirname,
  plugins: [
    expoManifestRequestHandlerPlugin(),
    metroPlugin({
      mainModuleName: 'index',
    }),
  ],
})
