import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one({
      app: {
        key: 'native-feature-tests',
      },
      native: {
        bundler: process.env.ONE_NATIVE_BUNDLER === 'rolldown' ? 'vite' : 'metro',
      },
    }),
  ],

  optimizeDeps: {
    exclude: ['react-native-bottom-tabs', '@bottom-tabs/react-navigation'],
  },
})
