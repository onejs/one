import { readFile, pathExists } from 'fs-extra'
import { describe, expect, it, inject } from 'vitest'
import { ONLY_TEST_DEV } from '@vxrn/test'
import { join } from 'node:path'

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
      join(fixturePath, 'dist', 'api', 'api', 'react-dep.js')
    )

    expect(sideEffectFreeApiRoute.includes('function isResponse')).toBeTruthy()

    // if sideEffects is not set in package.json of one it will include all of react etc
    expect(!sideEffectFreeApiRoute.includes('useEffect')).toBeTruthy()
  })

  it('should generate the dynamic endpoint file', async () => {
    const dynamicEndpointPath = join(
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

  it('should build tabs routes with headless ui components', async () => {
    // This test catches a regression where dynamic require() calls in one/ui/common.tsx
    // would fail during SSR build because relative paths don't resolve in bundled output
    const tabsHomePath = join(fixturePath, 'dist', 'client', 'tabs', 'index.html')
    const tabsOtherPath = join(fixturePath, 'dist', 'client', 'tabs', 'other.html')

    expect(await pathExists(tabsHomePath)).toBeTruthy()
    expect(await pathExists(tabsOtherPath)).toBeTruthy()

    const tabsHomeContent = await readFile(tabsHomePath, 'utf-8')
    expect(tabsHomeContent).toContain('Tabs Home')
  })

  it('should build SSG routes in nested route groups', async () => {
    // This test catches a regression where nested route groups like (site)/(legal)/
    // would return 404 on direct URL access because Rollup bundles them into shared
    // chunks, and the build loop couldn't find the client manifest entry by key match.
    // The fix uses the src property of manifest entries instead of guessing chunk names.
    const termsPath = join(fixturePath, 'dist', 'client', 'terms-of-service.html')
    const privacyPath = join(fixturePath, 'dist', 'client', 'privacy-policy.html')

    expect(await pathExists(termsPath)).toBeTruthy()
    expect(await pathExists(privacyPath)).toBeTruthy()

    const termsContent = await readFile(termsPath, 'utf-8')
    expect(termsContent).toContain('Terms of Service')

    const privacyContent = await readFile(privacyPath, 'utf-8')
    expect(privacyContent).toContain('Privacy Policy')
  })
})
