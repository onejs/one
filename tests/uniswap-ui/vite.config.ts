import { defineConfig } from 'vite'
import { one } from 'one/vite'
import vitePluginRequire from 'vite-plugin-require'

// @ts-ignore
const vpr = vitePluginRequire['default'] as typeof vitePluginRequire

export default defineConfig({
  plugins: [
    vpr({
      fileRegex: /uniswap-ui/,
    }),
    one(),
  ],
})
