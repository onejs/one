import { defineConfig } from 'vite'
import { expoManifestRequestHandlerPlugin, metroPlugin } from '@vxrn/vite-plugin-metro'

export default defineConfig({
  plugins: [expoManifestRequestHandlerPlugin(), metroPlugin()],
})
