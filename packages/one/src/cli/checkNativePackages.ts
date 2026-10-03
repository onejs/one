import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { satisfies } from 'semver'
import { blessedNativePackages } from '../native-packages'

export function checkNativePackages(root: string, platform?: string) {
  if (platform === 'web') return
  if (platform !== undefined && platform !== 'ios' && platform !== 'android') {
    throw new Error('[one] platform must be ios, android or web')
  }
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const require = createRequire(join(root, 'package.json'))
  const problems: string[] = []
  for (const pkg of blessedNativePackages) {
    const declared =
      Object.hasOwn(manifest.dependencies ?? {}, pkg.name) ||
      Object.hasOwn(manifest.devDependencies ?? {}, pkg.name)
    if (!declared) {
      if (pkg.required)
        problems.push(`${pkg.name}@${pkg.range} is required for native apps`)
      continue
    }
    let version: string
    try {
      version = require(`${pkg.name}/package.json`).version
    } catch {
      problems.push(`${pkg.name} is declared but not installed`)
      continue
    }
    if (!satisfies(version, pkg.range)) {
      problems.push(`${pkg.name}@${version} does not satisfy ${pkg.range}`)
    }
  }
  if (problems.length) {
    const install = blessedNativePackages
      .map((pkg) => `${pkg.name}@${pkg.range}`)
      .join(' ')
    throw new Error(
      `[one] native package check failed:\n${problems.join('\n')}\nInstall the tested set: bun add ${install}`
    )
  }
}
