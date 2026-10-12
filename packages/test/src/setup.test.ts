import { expect, test } from 'bun:test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const setup = fileURLToPath(new URL('./setup.ts', import.meta.url))
const servers = fileURLToPath(new URL('./setupTest.ts', import.meta.url))

for (const exitCode of [0, 1]) {
  test(`teardown preserves runner exit status ${exitCode} with a dangling handle`, () => {
    const result = spawnSync(process.execPath, ['--eval', `
      import { mock } from 'bun:test'
      mock.module(${JSON.stringify(servers)}, () => ({
        setupTestServers: async () => ({ testDevPort: 3456, testProdPort: 3457 }),
      }))
      const { setup, teardown } = await import(${JSON.stringify(setup)})
      await setup({ provide() {} })
      process.exitCode = ${exitCode}
      await teardown()
      await Bun.sleep(2200)
    `], { encoding: 'utf8', timeout: 10_000 })
    expect(result.error).toBeUndefined()
    expect(result.status).toBe(exitCode)
  })
}
