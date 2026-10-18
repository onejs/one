import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { findInstalledRozenitePlugins } from './rozeniteHost'

const roots: string[] = []

function createProject(dependencies: string[], plugins: Record<string, boolean>) {
  const root = mkdtempSync(path.join(tmpdir(), 'one-rozenite-'))
  roots.push(root)

  writeFileSync(
    path.join(root, 'package.json'),
    JSON.stringify({
      name: 'test-app',
      dependencies: Object.fromEntries(dependencies.map((name) => [name, '*'])),
    })
  )

  for (const [name, hasManifest] of Object.entries(plugins)) {
    const packageRoot = path.join(root, 'node_modules', ...name.split('/'))
    mkdirSync(path.join(packageRoot, 'dist'), { recursive: true })
    writeFileSync(
      path.join(packageRoot, 'package.json'),
      JSON.stringify({ name, main: 'index.js', exports: { '.': './index.js' } })
    )
    writeFileSync(path.join(packageRoot, 'index.js'), 'module.exports = {}')
    if (hasManifest) {
      writeFileSync(
        path.join(packageRoot, 'dist', 'rozenite.json'),
        JSON.stringify({ name, panels: [] })
      )
    }
  }

  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, { recursive: true, force: true })
  }
})

describe('findInstalledRozenitePlugins', () => {
  it('finds dependencies with a Rozenite manifest', () => {
    const root = createProject(
      ['@rozenite/storage-plugin', 'react-native', '@rozenite/not-a-plugin'],
      {
        '@rozenite/storage-plugin': true,
        'react-native': false,
        '@rozenite/not-a-plugin': false,
      }
    )

    expect(findInstalledRozenitePlugins(root)).toEqual(['@rozenite/storage-plugin'])
  })

  it('ignores dependencies that are not installed', () => {
    const root = createProject(['@rozenite/missing-plugin'], {})

    expect(findInstalledRozenitePlugins(root)).toEqual([])
  })
})
