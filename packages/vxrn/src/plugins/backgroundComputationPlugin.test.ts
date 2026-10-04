import { expect, test } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { rolldown } from 'rolldown'
import { backgroundComputationPlugin } from './backgroundComputationPlugin'
import { workletImportsPlugin } from './workletImportsPlugin'

async function bundle(source: string) {
  const root = mkdtempSync(join(tmpdir(), 'one-background-definition-'))
  writeFileSync(join(root, 'entry.ts'), source)
  writeFileSync(
    join(root, 'calculate.ts'),
    `import { multiplier } from './helper'; export function calculate(input: number) { return input * multiplier }`
  )
  writeFileSync(join(root, 'helper.ts'), 'export const multiplier = 3')
  let build: Awaited<ReturnType<typeof rolldown>> | undefined
  try {
    build = await rolldown({
      input: join(root, 'entry.ts'),
      plugins: [
        backgroundComputationPlugin('native'),
        workletImportsPlugin({}),
        {
          name: 'definition-contract',
          resolveId(id) {
            if (id === 'one/background') return '\0definition-contract'
          },
          load(id) {
            if (id === '\0definition-contract')
              return 'export function defineBackgroundComputation(calculate) { return calculate }'
          },
        },
      ],
    })
    const result = await build.generate({ format: 'cjs' })
    const chunk = result.output[0]
    if (chunk.type !== 'chunk') throw new Error('expected executable output')
    const exports: Record<string, unknown> = {}
    runInNewContext(chunk.code, { exports })
    return exports
  } finally {
    await build?.close()
    rmSync(root, { recursive: true, force: true })
  }
}

test('bundles an imported pure graph into the selected native calculation', async () => {
  const result = await bundle(
    `import { defineBackgroundComputation as define } from 'one/background'; import { calculate } from './calculate'; const task = define(calculate); export const answer = task(7);`
  )
  expect(result.answer).toBe(21)
})

test('unused definition imports do not reject a module', async () => {
  const result = await bundle(
    `import { defineBackgroundComputation } from 'one/background'; export const answer = 21;`
  )
  expect(result.answer).toBe(21)
})

test('rejects component definitions even beside a valid definition', async () => {
  await expect(
    bundle(
      `import { defineBackgroundComputation } from 'one/background'; import { calculate } from './calculate'; export const good = defineBackgroundComputation(calculate); export function Component() { return defineBackgroundComputation(calculate) }`
    )
  ).rejects.toThrow('definitions must be module-scope variables')
})

test('rejects inline calculations that can capture component state', async () => {
  await expect(
    bundle(
      `import { defineBackgroundComputation } from 'one/background'; export const bad = defineBackgroundComputation((input) => input);`
    )
  ).rejects.toThrow('one named import from a relative pure module')
})
