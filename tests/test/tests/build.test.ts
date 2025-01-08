import { readFile, pathExists } from 'fs-extra'
import * as path from 'node:path'
import { describe, expect, it, inject } from 'vitest'
import { ONLY_TEST_DEV } from '../../../packages/one/test/_constants'

describe('Simple Build Tests', () => {
  if (ONLY_TEST_DEV) {
    it('should pass', () => {
      expect(true).toBeTruthy()
    })
    return
  }

  const fixturePath = inject('testInfo').testDir

  it('should build api routes without including side effects', async () => {
    const sideEffectFreeApiRoute = await readFile(
      path.join(fixturePath, 'dist', 'api', 'api', 'react-dep.js')
    )

    expect(sideEffectFreeApiRoute.includes('function isResponse')).toBeTruthy()

    // if sideEffects is not set in package.json of one it will include all of react etc
    expect(!sideEffectFreeApiRoute.includes('useEffect')).toBeTruthy()
  })

  it('should generate the dynamic endpoint file', async () => {
    const dynamicEndpointPath = path.join(
      fixturePath,
      'dist',
      'api',
      'api',
      'test-params',
      '_endpointId_.js'
    )
    const fileExists = await pathExists(dynamicEndpointPath)
    expect(fileExists).toBeTruthy()
  })
})
