import { afterEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const workflow = Bun.YAML.parse(
  await Bun.file(join(root, '.github/workflows/release.yml')).text()
) as {
  on: { push: { branches: string[] } }
  jobs: { publish: { steps: { name: string; run?: string }[] } }
}
const fixtures: string[] = []
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((path) => rm(path, { recursive: true })))
})

async function prepare(kind: string, current: string, latest: string) {
  const dir = await mkdtemp(join(tmpdir(), 'one-workflow-'))
  fixtures.push(dir)
  await mkdir(join(dir, 'packages/one'), { recursive: true })
  await mkdir(join(dir, 'bin'))
  await writeFile(join(dir, 'packages/one/package.json'), JSON.stringify({ version: current }))
  await symlink(join(root, 'node_modules'), join(dir, 'node_modules'))
  for (const [name, body] of Object.entries({
    git: 'exit 0',
    npm: 'printf "%s\\n" "$TEST_LATEST"',
    bun: 'printf "%s\\n" "$@" > "$TEST_ARGS"',
  })) {
    await writeFile(join(dir, 'bin', name), `#!/bin/sh\n${body}\n`, { mode: 0o755 })
  }
  const run = workflow.jobs.publish.steps.find((step) => step.name === 'Prepare release commit')?.run
  if (!run) throw new Error('stable preparation step is missing')
  const result = Bun.spawnSync(['bash', '-c', run], {
    cwd: dir,
    env: {
      ...process.env,
      // github runs this shell without the local git wrapper; git here is a stub.
      BASH_ENV: '',
      PATH: `${join(dir, 'bin')}:${process.env.PATH}`,
      RELEASE_KIND: kind,
      TEST_LATEST: latest,
      TEST_ARGS: join(dir, 'args'),
    },
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const args = await Bun.file(join(dir, 'args')).exists()
    ? (await Bun.file(join(dir, 'args')).text()).trim().split('\n')
    : []
  return { code: result.exitCode, args, manifest: await Bun.file(join(dir, 'packages/one/package.json')).json() }
}

describe('stable release workflow', () => {
  test('main merges cannot trigger publication; beta pushes retain branch canaries', () => {
    expect(workflow.on.push.branches.includes('main')).toBe(false)
    expect(workflow.on.push.branches).toEqual(['v2-beta'])
  })

  test.each(['patch', 'minor', 'major'])('explicit %s preparation starts above npm latest', async (kind) => {
    const result = await prepare(kind, '2.6.0', '2.6.20')
    expect(result.code).toBe(0)
    expect(result.manifest.version).toBe('2.6.20')
    expect(result.args).toContain(`--${kind}`)
    expect(result.args).toContain('--skip-push')
  })

  test('a prepared minor is retained for its explicit minor release', async () => {
    const result = await prepare('minor', '2.7.0', '2.6.20')
    expect(result.code).toBe(0)
    expect(result.manifest.version).toBe('2.7.0')
    expect(result.args).toEqual([])
  })

  test('a patch dispatch cannot publish a prepared minor', async () => {
    const result = await prepare('patch', '2.7.0', '2.6.20')
    expect(result.code).not.toBe(0)
    expect(result.args).toEqual([])
  })
})
