import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'

const execFileAsync = promisify(execFile)

describe('prepareCacheForVersion', () => {
  let root: string | undefined

  afterEach(async () => {
    if (root) {
      await rm(root, { recursive: true, force: true })
    }
  })

  it('lets one process clean a stale same-root cache', async () => {
    root = await mkdtemp(join(tmpdir(), 'vxrn-concurrent-clean-'))
    const cacheDir = join(root, 'node_modules', '.vxrn')
    const viteDir = join(root, 'node_modules', '.vite')
    const participantsDir = join(root, 'participants')
    const participantCount = 4

    await Promise.all([
      mkdir(cacheDir, { recursive: true }),
      mkdir(viteDir, { recursive: true }),
      mkdir(participantsDir, { recursive: true }),
    ])
    await Promise.all([
      writeFile(join(cacheDir, 'state.json'), JSON.stringify({ versionHash: 'old' })),
      writeFile(join(cacheDir, 'stale'), 'stale'),
      writeFile(join(viteDir, 'stale'), 'stale'),
    ])

    const moduleUrl = pathToFileURL(join(dirname(import.meta.filename), 'clean.ts')).href
    const workerScript = (participant: number) => `
      import { readdir, writeFile } from 'node:fs/promises'
      import { join } from 'node:path'
      import { prepareCacheForVersion } from ${JSON.stringify(moduleUrl)}

      const root = ${JSON.stringify(root)}
      const participantsDir = ${JSON.stringify(participantsDir)}
      await writeFile(join(participantsDir, ${JSON.stringify(String(participant))}), '')
      while ((await readdir(participantsDir)).length < ${participantCount}) {
        await Bun.sleep(5)
      }
      const cleaned = await prepareCacheForVersion({
        root,
        cacheDir: join(root, 'node_modules', '.vxrn'),
        versionHash: 'new',
      })
      console.info(cleaned ? 'cleaned-by-worker' : 'cache-already-current')
    `

    const results = await Promise.all(
      Array.from({ length: participantCount }, (_, participant) =>
        execFileAsync('bun', ['-e', workerScript(participant)], {
          env: { ...process.env, VXRN_DONT_CLEAN_SELF: '' },
        })
      )
    )
    const output = results.map(({ stdout }) => stdout).join('\n')

    expect(output.match(/\[vxrn\] cleaning/g)).toHaveLength(1)
    expect(output.match(/cleaned-by-worker/g)).toHaveLength(1)
    expect(JSON.parse(await readFile(join(cacheDir, 'state.json'), 'utf8'))).toEqual({
      versionHash: 'new',
    })
    await expect(readFile(join(cacheDir, 'stale'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(readFile(join(viteDir, 'stale'))).rejects.toMatchObject({
      code: 'ENOENT',
    })
    await expect(
      readFile(join(root, 'node_modules', '.vxrn-clean.lock'))
    ).rejects.toMatchObject({ code: 'ENOENT' })
  }, 20_000)
})
