import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import { writeFile } from 'node:fs/promises'

await writeFile(
  './dist/wrangler-test.toml',
  `
assets = { directory = "client" }
compatibility_date = "2024-12-05"
compatibility_flags = ['nodejs_compat_v2']
`
)

export default defineWorkersConfig({
  test: {
    poolOptions: {
      workers: {
        isolatedStorage: false,
        wrangler: { configPath: './dist/wrangler-test.toml' },
      },
    },
  },
})
