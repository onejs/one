import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath, URL } from 'node:url'
import { describe, expect, test } from 'vitest'

const packageDirectory = fileURLToPath(new URL('../', import.meta.url))

function collectExportTargets(value: unknown): string[] {
  if (typeof value === 'string') {
    return value.includes('*') ? [] : [value]
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return []
  }

  return Object.values(value).flatMap(collectExportTargets)
}

describe('package exports', () => {
  test('all concrete targets exist in the built package', () => {
    const packageJson: unknown = JSON.parse(
      readFileSync(`${packageDirectory}/package.json`, 'utf8')
    )

    if (!packageJson || typeof packageJson !== 'object' || !('exports' in packageJson)) {
      throw new Error('one package.json must define exports')
    }

    const missing = collectExportTargets(packageJson.exports).filter(
      (target) => !existsSync(`${packageDirectory}/${target}`)
    )

    expect(missing).toEqual([])
  })
})

describe('workspace package entry points', () => {
  test.each(['emitter', 'vite-native-hmr', 'test-package', 'url-parse'])(
    '%s exports built files and existing declarations',
    (name) => {
      const directory = fileURLToPath(new URL(`../../${name}/`, import.meta.url))
      const pkg = JSON.parse(readFileSync(`${directory}/package.json`, 'utf8'))
      const missing = collectExportTargets(pkg.exports).filter(
        (target) => !existsSync(`${directory}/${target}`)
      )
      expect(missing).toEqual([])
    }
  )

  test('the CommonJS emitter delivers values and removes listeners', () => {
    const require = createRequire(import.meta.url)
    const { createEmitter } = require('@vxrn/emitter')
    const emitter = createEmitter('initial')
    const values: string[] = []
    const dispose = emitter.listen((value: string) => values.push(value))
    emitter.emit('next')
    dispose()
    emitter.emit('after disposal')
    expect(values).toEqual(['next'])
    expect(emitter.value).toBe('after disposal')
  })
})
