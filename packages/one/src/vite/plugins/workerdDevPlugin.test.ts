import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { generateWorkerdDevEntryModule } from './workerdDevPlugin'

let testDir: string | undefined

afterEach(() => {
  if (testDir) {
    rmSync(testDir, { recursive: true, force: true })
    testDir = undefined
  }
})

describe('generateWorkerdDevEntryModule', () => {
  it('emits createWorkerHandler wiring and lazy imports for pages and api routes', () => {
    testDir = mkdtempSync(join(tmpdir(), 'one-workerd-entry-'))
    const appDir = join(testDir, 'app')
    mkdirSync(join(appDir, 'api'), { recursive: true })
    writeFileSync(
      join(appDir, 'ssr-page+ssr.tsx'),
      'export default function Page() { return null }\n'
    )
    writeFileSync(
      join(appDir, 'api', 'hello+api.ts'),
      'export function GET() { return new Response("ok") }\n'
    )

    const code = generateWorkerdDevEntryModule({
      root: testDir,
      options: { web: { defaultRenderMode: 'ssr' } },
      routerRoot: 'app',
      routePaths: ['./ssr-page+ssr.tsx', './api/hello+api.ts'],
      preloads: ['/@vite/client'],
    })

    expect(code).toContain("from 'one/serve-worker'")
    expect(code).toContain('disableModuleCache: true')
    expect(code).toContain('serverEntry: () => import("virtual:one-entry")')
    expect(code).toContain('/api/hello')
    expect(code).toContain('ssr-page+ssr.tsx')
  })
})
