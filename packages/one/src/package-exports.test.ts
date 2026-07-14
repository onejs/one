import { existsSync, readFileSync } from 'node:fs'
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
