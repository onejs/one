#!/usr/bin/env bun

/**
 * Usage:
 *   bun run link-workspaces.ts <workspaceDir1> <workspaceDir2> ...
 */

import { cp, mkdir, readFile, readdir, rename, rm, stat, symlink } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join, relative, resolve } from 'node:path'

// if not run through bun exit:
// @ts-ignore
if (typeof Bun === 'undefined') {
  console.error(`Must run in Bun due to using ~ resolutions`)
  process.exit(1)
}

const IGNORE_DIR = 'node_modules'

type PackageVersionInfo = {
  name: string
  version: string
  workspace: string
  path: string
}

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
              if (pkgData.name && !pkgData.name.startsWith('@types/')) {
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

async function checkAllPackageVersionsAligned(
  workspaceDirs: string[],
  packagesToCheck: Record<string, string>
) {
  const allPackageVersions: PackageVersionInfo[] = []

  // Include current directory along with provided workspace directories
  const allDirs = [process.cwd(), ...workspaceDirs]

  // Get all dependencies of packages we're going to link
  const allDepsToCheck = new Set<string>()

  // Add the packages we're linking
  for (const pkgName of Object.keys(packagesToCheck)) {
    allDepsToCheck.add(pkgName)
  }

  // Add dependencies of packages we're linking
  for (const [pkgName, pkgPath] of Object.entries(packagesToCheck)) {
    const deps = await getPackageDependencies(pkgPath)
    for (const dep of deps) {
      allDepsToCheck.add(dep)
    }
  }

  // Collect package versions only for packages we care about
  for (const workspaceDir of allDirs) {
    const resolved = resolve(workspaceDir)
    const workspaceName =
      workspaceDir === process.cwd()
        ? 'current'
        : workspaceDir.split('/').pop() || workspaceDir
    const packages = await collectSpecificNodeModulePackages(
      resolved,
      workspaceName,
      allDepsToCheck
    )
    allPackageVersions.push(...packages)
  }

  // Group by package name
  const packageGroups: Record<string, PackageVersionInfo[]> = {}
  for (const pkg of allPackageVersions) {
    if (!packageGroups[pkg.name]) {
      packageGroups[pkg.name] = []
    }
    packageGroups[pkg.name].push(pkg)
  }

  // Find mismatched versions across different workspaces only
  const mismatches: Array<{ name: string; versions: PackageVersionInfo[] }> = []
  for (const [pkgName, versions] of Object.entries(packageGroups)) {
    // Group versions by workspace to avoid comparing within the same workspace
    const versionsByWorkspace: Record<string, string> = {}
    for (const version of versions) {
      versionsByWorkspace[version.workspace] = version.version
    }

    const uniqueVersions = new Set(Object.values(versionsByWorkspace))
    if (uniqueVersions.size > 1) {
      // Only include one version per workspace for cleaner output
      const uniqueVersionsArray = Object.entries(versionsByWorkspace).map(
        ([workspace, version]) => ({
          name: pkgName,
          version,
          workspace,
          path: versions.find((v) => v.workspace === workspace)?.path || '',
        })
      )
      mismatches.push({ name: pkgName, versions: uniqueVersionsArray })
    }
  }

  // Report results
  if (mismatches.length === 0) {
    console.info('✓ All package versions are aligned across workspaces!')
    return true
  }

  console.info(
    `\n❌ Found ${mismatches.length} packages with mismatched versions, this may cause issues linking:\n`
  )

  for (const { name, versions } of mismatches) {
    console.info(`Package: ${name}`)
    for (const version of versions) {
      console.info(`  ${version.workspace}: ${version.version}`)
    }
    console.info('')
  }

  return false
}

async function getPackageDependencies(packagePath: string): Promise<string[]> {
  const dependencies = new Set<string>()

  try {
    const pkgJsonPath = join(packagePath, 'package.json')
    const raw = await readFile(pkgJsonPath, 'utf-8')
    const pkgData = JSON.parse(raw)

    // Collect all types of dependencies
    const depTypes = [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]
    for (const depType of depTypes) {
      if (pkgData[depType]) {
        for (const depName of Object.keys(pkgData[depType])) {
          if (!depName.startsWith('@types/')) {
            dependencies.add(depName)
          }
        }
      }
    }
  } catch {
    // Ignore errors reading package.json
  }

  return Array.from(dependencies)
}

async function collectSpecificNodeModulePackages(
  workspaceDir: string,
  workspaceName: string,
  packagesToFind: Set<string>
): Promise<PackageVersionInfo[]> {
  const packages: PackageVersionInfo[] = []
  const nodeModulesPath = join(workspaceDir, 'node_modules')

  async function recurseNodeModules(dir: string, depth = 0) {
    // Avoid infinite recursion in nested node_modules
    if (depth > 10) return

    let entries: string[]
    try {
      entries = await readdir(dir)
    } catch {
      return
    }

    for (const entry of entries) {
      const fullPath = join(dir, entry)
      let entryStat
      try {
        entryStat = await stat(fullPath)
      } catch {
        continue
      }

      if (entryStat.isDirectory()) {
        if (entry.startsWith('@')) {
          // Scoped package directory, recurse into it
          await recurseNodeModules(fullPath, depth + 1)
        } else if (entry !== '.bin' && entry !== '.cache') {
          // Regular package directory
          const pkgJsonPath = join(fullPath, 'package.json')
          try {
            const pkgJsonStat = await stat(pkgJsonPath)
            if (pkgJsonStat.isFile()) {
              const raw = await readFile(pkgJsonPath, 'utf-8')
              const pkgData = JSON.parse(raw)
              if (
                pkgData.name &&
                pkgData.version &&
                packagesToFind.has(pkgData.name) &&
                !pkgData.name.startsWith('@types/')
              ) {
                packages.push({
                  name: pkgData.name,
                  version: pkgData.version,
                  workspace: workspaceName,
                  path: fullPath,
                })
              }
            }
          } catch {
            // Not a valid package, might have nested node_modules
            const nestedNodeModules = join(fullPath, 'node_modules')
            try {
              const nestedStat = await stat(nestedNodeModules)
              if (nestedStat.isDirectory()) {
                await recurseNodeModules(nestedNodeModules, depth + 1)
              }
            } catch {}
          }
        }
      }
    }
  }

  try {
    await recurseNodeModules(nodeModulesPath)
  } catch {
    // Workspace might not have node_modules yet
  }

  return packages
}

async function main() {
  const args = process.argv.slice(2)

  if (args.includes('--unlink')) {
    await undoLinks()
    process.exit(0)
  }

  const workspaceDirs = args.filter((arg) => !arg.startsWith('--'))

  if (args.length === 0) {
    console.info('No workspace directories provided.')
    process.exit(0)
  }

  // Find all local packages first
  const allLocalPackages: Record<string, string> = {}
  for (const workspaceDir of workspaceDirs) {
    const resolved = resolve(workspaceDir)
    const found = await findLocalPackages(resolved)
    Object.assign(allLocalPackages, found)
  }

  // Run check with scoped packages
  if (!(await checkAllPackageVersionsAligned(workspaceDirs, allLocalPackages))) {
    if (args.includes('--check')) {
      // only exit if checking, otherwise its a warning
      process.exit(1)
    }
  } else {
    if (args.includes('--check')) {
      return
    }
  }

  await linkPackages(allLocalPackages)
  console.info(`\n ✓ linked ${Object.keys(allLocalPackages).length} packages`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
