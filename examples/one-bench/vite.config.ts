import { defineConfig } from 'vite'
import { one } from 'one/vite'

export default defineConfig({
  plugins: [
    one({
      native: {
        app: {
          name: 'OneBench',
          ios: {
            bundleId: 'dev.onestack.bench',
            deploymentTarget: '17.0',
            ...(process.env.BENCH_ENGINE === 'bun' ? { engine: 'bun' as const } : {}),
          },
        },
      },
    }),
  ],
})
