import {
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  generateForPlatform,
  getNativeDependencyInventory,
  renderPrebuildFile,
  validatePrebuildApp,
} from './prebuildWithoutExpo'

const app = {
  name: 'MyApp',
  displayName: 'My App',
  ios: { bundleId: 'dev.one.myapp' },
  android: { applicationId: 'dev.one.myapp' },
}

describe('native.app prebuild validation', () => {
  it('accepts a valid manifest', () => {
    expect(() => validatePrebuildApp(app)).not.toThrow()
    expect(() => validatePrebuildApp(app, 'ios')).not.toThrow()
    expect(() => validatePrebuildApp(app, 'android')).not.toThrow()
  })

  it('rejects invalid target names and missing platform ids before writing', () => {
    expect(() => validatePrebuildApp({} as any)).toThrow(/name/)
    expect(() => validatePrebuildApp({ name: 'my-app' } as any)).toThrow(/name/)
    expect(() => validatePrebuildApp({ name: 'MyApp' } as any)).toThrow(/bundleId/)
    expect(() =>
      validatePrebuildApp({ name: 'MyApp', android: app.android } as any)
    ).toThrow(/bundleId/)
    expect(() =>
      validatePrebuildApp(
        { name: 'MyApp', ios: { bundleId: 'not-an-id' }, android: app.android } as any
      )
    ).toThrow(/bundleId/)
    // platform-scoped: android-only skips the ios requirement and vice versa
    expect(() =>
      validatePrebuildApp({ name: 'MyApp', android: app.android } as any, 'android')
    ).not.toThrow()
    expect(() =>
      validatePrebuildApp({ name: 'MyApp', ios: app.ios } as any, 'ios')
    ).not.toThrow()
  })
})

describe('template rendering', () => {
  it('applies names, display name, and platform ids', () => {
    const ios = renderPrebuildFile({
      relativePath: 'HelloWorld.xcodeproj/project.pbxproj',
      content: 'PRODUCT_BUNDLE_IDENTIFIER = "org.reactjs.native.example.$(PRODUCT_NAME:rfc1034identifier)"; target HelloWorld',
      platform: 'ios',
      app,
    })
    expect(ios.destRelativePath).toBe('MyApp.xcodeproj/project.pbxproj')
    expect(ios.content).toContain('PRODUCT_BUNDLE_IDENTIFIER = "dev.one.myapp"')
    expect(ios.content).not.toContain('HelloWorld')

    const android = renderPrebuildFile({
      relativePath: 'app/src/main/java/com/helloworld/MainActivity.kt',
      content: 'package com.helloworld\n// Hello App Display Name',
      platform: 'android',
      app,
    })
    expect(android.destRelativePath).toBe('app/src/main/java/dev/one/myapp/MainActivity.kt')
    expect(android.content).toContain('package dev.one.myapp')
    expect(android.content).toContain('My App')
  })

  it('passes binaries through untouched', () => {
    const rendered = renderPrebuildFile({
      relativePath: 'res/icon.png',
      content: null,
      platform: 'android',
      app,
    })
    expect(rendered.content).toBeNull()
  })

  it('renders byte-identically across runs', () => {
    const args = {
      relativePath: 'app/build.gradle',
      content: 'namespace "com.helloworld"\napplicationId "com.helloworld"',
      platform: 'android' as const,
      app,
    }
    expect(renderPrebuildFile(args)).toEqual(renderPrebuildFile(args))
  })
})

describe('community autolink inventory', () => {
  it('discovers installed packages through community config, sorted', async () => {
    const root = mkdtempSync(join(tmpdir(), 'vxrn-autolink-'))
    // everything resolves from the fixture root, exactly as in a real app;
    // workspace installs are linked so the test needs no network.
    const workspaceModules = fileURLToPath(new URL('../../../../node_modules', import.meta.url))
    mkdirSync(join(root, 'node_modules', '@react-native-community'), { recursive: true })
    const { symlinkSync } = await import('node:fs')
    for (const name of [
      'cli',
      'cli-config',
      'cli-config-android',
      'cli-config-apple',
      'cli-tools',
      'cli-types',
      'template',
    ]) {
      symlinkSync(
        join(workspaceModules, '@react-native-community', name),
        join(root, 'node_modules', '@react-native-community', name)
      )
    }
    symlinkSync(
      join(workspaceModules, 'react-native-safe-area-context'),
      join(root, 'node_modules', 'react-native-safe-area-context')
    )
    writeFileSync(
      join(root, 'package.json'),
      JSON.stringify({
        name: 'fixture',
        dependencies: {
          'react-native-safe-area-context': '*',
          plain: '1.0.0',
        },
      })
    )
    const plain = join(root, 'node_modules', 'plain')
    mkdirSync(plain, { recursive: true })
    writeFileSync(join(plain, 'package.json'), JSON.stringify({ name: 'plain' }))

    // generate real projects first: discovery keys off the ios Podfile and
    // the android gradle project, the same inputs pods and gradle consume.
    await generateForPlatform(root, 'ios', app)
    await generateForPlatform(root, 'android', app)

    const inventory = await getNativeDependencyInventory(root)
    expect(inventory.map((entry) => entry.name)).toEqual([
      'plain',
      'react-native-safe-area-context',
    ])
    expect(
      inventory.find((entry) => entry.name === 'react-native-safe-area-context')?.platforms
    ).toEqual(['android', 'ios'])
  }, 180000)
})

describe('generateForPlatform determinism', () => {
  it('regenerates byte-identical projects from the same manifest', async () => {
    // root stays the workspace so the installed community template resolves;
    // output goes to isolated temp dirs, never the repo.
    const workspaceRoot = fileURLToPath(new URL('../../../..', import.meta.url))
    const snapshot = (dir: string): Array<[string, string]> => {
      const out: Array<[string, string]> = []
      const walkDir = (current: string) => {
        for (const entry of readdirSync(current).sort()) {
          const full = join(current, entry)
          if (statSync(full).isDirectory()) walkDir(full)
          else {
            const buffer = readFileSync(full)
            out.push([relative(dir, full), buffer.toString('base64')])
          }
        }
      }
      walkDir(dir)
      return out
    }
    const first = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-a-'))
    const second = mkdtempSync(join(tmpdir(), 'vxrn-prebuild-b-'))
    await generateForPlatform(workspaceRoot, 'ios', app, join(first, 'ios'))
    await generateForPlatform(workspaceRoot, 'ios', app, join(second, 'ios'))
    await generateForPlatform(workspaceRoot, 'android', app, join(first, 'android'))
    await generateForPlatform(workspaceRoot, 'android', app, join(second, 'android'))
    expect(snapshot(first)).toEqual(snapshot(second))

    const pbxproj = readFileSync(
      join(first, 'ios', 'MyApp.xcodeproj', 'project.pbxproj'),
      'utf8'
    )
    expect(pbxproj).toContain('PRODUCT_BUNDLE_IDENTIFIER = "dev.one.myapp"')
    const gradle = readFileSync(
      join(first, 'android', 'app', 'build.gradle'),
      'utf8'
    )
    expect(gradle).toContain('applicationId "dev.one.myapp"')
  }, 180000)
})
