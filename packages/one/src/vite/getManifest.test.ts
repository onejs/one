import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getManifest } from './getManifest'

let testDir: string | undefined

function writeRoute(relativePath: string) {
  if (!testDir) {
    testDir = mkdtempSync(join(tmpdir(), 'one-get-manifest-'))
  }

  const filePath = join(testDir, 'app', relativePath)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, 'export default function Route() { return null }')
}

afterEach(() => {
  if (testDir) {
    rmSync(testDir, { recursive: true, force: true })
    testDir = undefined
  }
})

describe('getManifest', () => {
  it('filters ignoredRouteFiles from server route manifests', () => {
    writeRoute('index.tsx')
    writeRoute('about.tsx')
    writeRoute('contact.test.tsx')
    writeRoute('admin/dashboard.tsx')
    writeRoute('admin/types.ts')
    writeRoute('api/users+api.ts')

    const manifest = getManifest({
      routerRoot: join(testDir!, 'app'),
      ignoredRouteFiles: ['**/*.test.*', '**/types.ts'],
    })

    const files = manifest?.allRoutes.map((route) => route.file) ?? []

    expect(files).toContain('./index.tsx')
    expect(files).toContain('./about.tsx')
    expect(files).toContain('./admin/dashboard.tsx')
    expect(files).toContain('./api/users+api.ts')
    expect(files).not.toContain('./contact.test.tsx')
    expect(files).not.toContain('./admin/types.ts')
  })
})
