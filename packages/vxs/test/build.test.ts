import FSExtra from 'fs-extra'
import { spawnSync } from 'node:child_process'
import * as path from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'

const fixturePath = path.resolve(__dirname, '../../../examples/test')

describe('Simple Build Tests', () => {
  beforeAll(async () => {
    spawnSync('yarn', ['build:prod'], { cwd: fixturePath })
  })

  it('should build api routes without including side effects', async () => {
    const sideEffectFreeApiRoute = await FSExtra.readFile(
      path.join(fixturePath, 'dist', 'api', 'api', 'react-dep.js')
    )

    expect(sideEffectFreeApiRoute.includes('function isResponse')).toBeTruthy()

    // if sideEffects is not set in package.json of vxs it will include all of react etc
    expect(!sideEffectFreeApiRoute.includes('useEffect')).toBeTruthy()
  })
})
