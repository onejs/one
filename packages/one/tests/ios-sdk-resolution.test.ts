import { mkdtempSync, mkdirSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveIosSdkImport } from '../src/utils/iosSdkFacade'
import { iosSdkPlugin } from '../src/vite/plugins/iosSdkPlugin'

const roots: string[] = []
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

function installedApp() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'one-sdk-resolution-')))
  roots.push(root)
  const pkg = join(root, 'node_modules/one')
  mkdirSync(join(pkg, 'dist/esm/ios'), { recursive: true })
  writeFileSync(join(root, 'package.json'), '{"name":"eas-only-app"}')
  writeFileSync(join(pkg, 'package.json'), JSON.stringify({
    name: 'one', exports: { './package.json': './package.json' },
  }))
  const facade = join(pkg, 'dist/esm/ios/Foundation.native.js')
  writeFileSync(facade, 'export const linkedFramework = "Foundation"\n')
  return { root, facade }
}

describe('installed iOS SDK resolution', () => {
  it('resolves from the installed package without an iOS project or local prebuild', () => {
    const { root, facade } = installedApp()
    expect(resolveIosSdkImport(root, 'one/ios/Foundation', 'ios', 'app.ios.ts')).toBe(facade)
    const plugin = iosSdkPlugin('ios', root)
    const resolve = plugin.resolveId as { handler: (source: string, importer: string) => string }
    expect(resolve.handler('one/ios/Foundation', 'app.ios.ts')).toBe(facade)
  })

  it('keeps the platform boundary and rejects a framework absent from the package', () => {
    const { root } = installedApp()
    expect(() => resolveIosSdkImport(root, 'one/ios/Foundation', 'android', 'app.ts')).toThrow(/iOS framework/)
    expect(() => resolveIosSdkImport(root, 'one/ios/NotASDK', 'ios', 'app.ios.ts')).toThrow(/not included.*installed/)
    expect(resolveIosSdkImport(root, 'one/ui', 'ios', 'app.ios.ts')).toBeUndefined()
  })
})
