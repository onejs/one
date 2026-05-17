import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { generateRouteTypes } from './generateRouteTypes'

describe(generateRouteTypes, () => {
  const originalCwd = process.cwd()
  let tempRoot: string | undefined

  afterEach(() => {
    process.chdir(originalCwd)

    if (tempRoot) {
      rmSync(tempRoot, { recursive: true, force: true })
      tempRoot = undefined
    }
  })

  it('does not rewrite routes declarations when contents are unchanged', async () => {
    tempRoot = mkdtempSync(path.join(tmpdir(), 'one-routes-types-'))
    const appDir = path.join(tempRoot, 'app')
    mkdirSync(appDir)
    writeFileSync(
      path.join(appDir, 'index+ssg.tsx'),
      'export default function Index() { return null }\n'
    )
    writeFileSync(
      path.join(appDir, '[slug]+ssg.tsx'),
      'export default function Slug() { return null }\n'
    )

    process.chdir(tempRoot)

    const outFile = path.join('app', 'routes.d.ts')
    await generateRouteTypes(outFile, 'app')

    const oldDate = new Date('2001-01-01T00:00:00.000Z')
    utimesSync(outFile, oldDate, oldDate)
    const previousMtimeMs = statSync(outFile).mtimeMs

    await generateRouteTypes(outFile, 'app')

    expect(statSync(outFile).mtimeMs).toBe(previousMtimeMs)
  })
})
