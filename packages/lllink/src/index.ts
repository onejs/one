#!/usr/bin/env bun

/**
 * Usage:
 *   bun run link-workspaces.ts <workspaceDir1> <workspaceDir2> ...
 */

import { readdir, readFile, stat, rm, symlink, rename, mkdir, cp } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, relative, resolve } from 'node:path'

// if not run through bun exit:
// @ts-ignore
if (typeof Bun === 'undefined') {
  console.error(`Must run in Bun due to using ~ resolutions`)
  process.exit(1)
}

const IGNORE_DIR = 'node_modules'

async function findLocalPackages(rootDir: string): Promise<Record<string, string>> {
  const results: Record<string, string> = {}

  async function recurse(dir: string) {
    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      return
    }

    await Promise.all(
      entries.map(async (entry) => {
        if (entry === IGNORE_DIR) return
        const fullPath = join(dir, entry)
        let entryStat
        try {
          entryStat = await stat(fullPath)
        } catch {
          return
        }
        if (entryStat.isDirectory()) {
          const pkgJsonPath = join(fullPath, 'package.json')
          try {
            const pkgJsonStat = await stat(pkgJsonPath)
            if (pkgJsonStat.isFile()) {
              const raw = await readFile(pkgJsonPath, 'utf-8')
              const pkgData = JSON.parse(raw)
              if (pkgData.name) {
                results[pkgData.name] = fullPath
              }
            }
          } catch {
            await recurse(fullPath)
          }
        }
      })
    )
  }

  await recurse(rootDir)
  return results
}

async function linkPackages(externalPackages: Record<string, string>) {
  const backupDir = join(process.cwd(), 'node_modules', '.cache', 'lllink', 'moved')
  await mkdir(backupDir, { recursive: true })
  for (const pkgName of Object.keys(externalPackages)) {
    const localPath = join(process.cwd(), 'node_modules', ...pkgName.split('/'))
    try {
      const existingStat = await stat(localPath)
      if (existingStat) {
        await cp(localPath, join(backupDir, pkgName.replace('/', '__')), {
          recursive: true,
          dereference: true,
        })
      }
      const externalPath = externalPackages[pkgName]
      if (externalPath) {
        console.info(
          `symlink ${relative(process.cwd(), localPath)} to ${externalPath.replace(homedir(), '~')}`
        )
        await rm(localPath, { recursive: true, force: true }).catch(() => {})
        await symlink(externalPath, localPath)
      }
    } catch {}
  }
}

async function undoLinks() {
  const backupDir = join(process.cwd(), 'node_modules', '.cache', 'lllink', 'moved')
  let movedItems: string[]
  try {
    movedItems = await readdir(backupDir)
  } catch {
    console.info('Nothing to undo.')
    return
  }
  for (const item of movedItems) {
    const originalName = item.replace('__', '/')
    const nmPath = join(process.cwd(), 'node_modules', ...originalName.split('/'))
    await rm(nmPath, { recursive: true, force: true }).catch(() => {})
    await rename(join(backupDir, item), nmPath).catch(() => {})
    console.info(`Restored: ${originalName}`)
  }
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--unlink')) {
    await undoLinks()
    process.exit(0)
  }
  if (args.length === 0) {
    console.info('No workspace directories provided.')
    process.exit(0)
  }
  const allLocalPackages: Record<string, string> = {}
  for (const workspaceDir of args) {
    const resolved = resolve(workspaceDir)
    const found = await findLocalPackages(resolved)
    Object.assign(allLocalPackages, found)
  }
  await linkPackages(allLocalPackages)
  console.info(`\n ✓ linked ${Object.keys(allLocalPackages).length} packages`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
