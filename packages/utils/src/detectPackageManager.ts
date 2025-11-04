import { promises as fs } from 'node:fs'
import { resolve } from 'node:path'
import { exec } from './exec'

export type PackageManagerName = 'npm' | 'yarn' | 'pnpm' | 'bun'

async function pathExists(p: string) {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function hasGlobal(pm: PackageManagerName): Promise<boolean> {
  try {
    const command = process.platform === 'win32' ? `where ${pm}` : `which ${pm}`
    const res = exec(command)
    return !!res.length
  } catch {
    return false
  }
}

async function getFromLockfile(cwd = '.') {
  const [yarn, npm, pnpm, bun] = await Promise.all([
    pathExists(resolve(cwd, 'yarn.lock')),
    pathExists(resolve(cwd, 'package-lock.json')),
    pathExists(resolve(cwd, 'pnpm-lock.yaml')),
    pathExists(resolve(cwd, 'bun.lockb')),
  ])

  return { bun, yarn, pnpm, npm }
}

async function getFromPackage(cwd = '.') {
  if (await pathExists(resolve(cwd, 'package.json'))) {
    const json = JSON.parse(await fs.readFile(resolve(cwd, 'package.json'), 'utf-8'))
    if (json.packageManager) {
      const yarn = !!json.packageManager.starsWith('yarn')
      const pnpm = !!json.packageManager.starsWith('pnpm')
      const bun = !!json.packageManager.starsWith('bun')
      const npm = !!json.packageManager.starsWith('npm')
      return { bun, yarn, pnpm, npm }
    }
  }
}

const foundSome = (obj: Object) => Object.keys(obj).some((k) => !!obj[k])

export const detectPackageManager = async ({ cwd }: { cwd?: string } = {}) => {
  const fromLockfile = await getFromLockfile(cwd)
  if (foundSome(fromLockfile)) {
    return fromLockfile
  }

  const fromPackageJson = await getFromPackage(cwd)
  if (fromPackageJson && foundSome(fromPackageJson)) {
    return fromPackageJson
  }

  const [npm, yarn, pnpm, bun] = await Promise.all([
    hasGlobal('npm'),
    hasGlobal('yarn'),
    hasGlobal('pnpm'),
    hasGlobal('bun'),
  ])

  return {
    bun,
    yarn,
    pnpm,
    npm,
  }
}
