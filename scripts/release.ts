import path from 'node:path'
import * as proc from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import fs, { ensureDir, writeJson, writeJSON } from 'fs-extra'
import pMap from 'p-map'
import prompts from 'prompts'
import { spawnify } from './spawnify'
import blockedVersions from './blocked-versions.json'

// avoid emitter error
process.setMaxListeners(50)
process.stderr.setMaxListeners(50)
process.stdout.setMaxListeners(50)

// skip over versions taken by the old "one" package on npm
function skipBlockedVersions(
  version: string,
  mode: 'patch' | 'minor' | 'major' = 'patch'
): string {
  const blocked = new Set(blockedVersions.one)
  let current = version
  while (blocked.has(current)) {
    console.info(`Version ${current} is blocked (old npm package), skipping...`)
    const [major, minor, patch] = current.split('.').map(Number)
    if (mode === 'major') {
      current = `${major + 1}.0.0`
    } else if (mode === 'minor') {
      current = `${major}.${minor + 1}.0`
    } else {
      current = `${major}.${minor}.${patch + 1}`
    }
  }
  return current
}

// --resume would be cool here where it stores the last failed step somewhere and tries resuming

const exec = promisify(proc.exec)
export const spawn = proc.spawn

// for failed publishes that need to re-run
const confirmFinalPublish = process.argv.includes('--confirm-final-publish')
const reRun = process.argv.includes('--rerun')
const rePublish = reRun || process.argv.includes('--republish')
const finish = process.argv.includes('--finish')
const skipFinish = process.argv.includes('--skip-finish')

const canary = process.argv.includes('--canary')
const isRC = process.argv.includes('--rc')
const skipVersion = finish || rePublish || process.argv.includes('--skip-version')
const shouldPatch = process.argv.includes('--patch')
const dirty = finish || process.argv.includes('--dirty')
const skipPublish = process.argv.includes('--skip-publish')
const skipTest =
  finish ||
  rePublish ||
  process.argv.includes('--skip-test') ||
  process.argv.includes('--skip-tests')
const skipNativeTest =
  process.argv.includes('--skip-native-test') ||
  process.argv.includes('--skip-native-tests')
const skipBuild = finish || rePublish || process.argv.includes('--skip-build')
const dryRun = process.argv.includes('--dry-run')
const tamaguiGitUser = process.argv.includes('--tamagui-git-user')
const isCI = finish || process.argv.includes('--ci')

const curVersion = fs.readJSONSync('./packages/one/package.json').version

// Check if current version is an RC (e.g., 1.3.0-rc.1)
const rcMatch = curVersion.match(/^(\d+\.\d+\.\d+)-rc\.(\d+)$/)
const isCurrentRC = !!rcMatch
const currentRCBase = rcMatch ? rcMatch[1] : null
const currentRCNumber = rcMatch ? Number.parseInt(rcMatch[2], 10) : 0

const nextVersion = (() => {
  if (canary) {
    return `${curVersion.replace(/(-\d+)+$/, '')}-${Date.now()}`
  }

  if (rePublish) {
    return curVersion
  }

  // RC mode: bump existing RC or will prompt for new RC version
  if (isRC) {
    if (isCurrentRC) {
      // Already an RC, bump the RC number
      return `${currentRCBase}-rc.${currentRCNumber + 1}`
    }
    // Not an RC yet, return placeholder - will be set via prompt
    return null
  }

  let plusVersion = skipVersion ? 0 : 1
  const patchAndCanary = curVersion.split('.')[2]
  const [patch, lastCanary] = patchAndCanary.split('-')
  // if were publishing another canary no bump version
  if (lastCanary && canary) {
    plusVersion = 0
  }
  const patchVersion = shouldPatch ? +patch + plusVersion : 0
  const curMinor = +curVersion.split('.')[1] || 0
  const minorVersion = curMinor + (shouldPatch ? 0 : plusVersion)
  const next = `1.${minorVersion}.${patchVersion}`

  return skipBlockedVersions(next, shouldPatch ? 'patch' : 'minor')
})()

if (!skipVersion) {
  console.info('Current:', curVersion)
  if (isRC) {
    if (isCurrentRC) {
      console.info(`RC mode: bumping RC ${currentRCNumber} → ${currentRCNumber + 1}`)
    } else {
      console.info('RC mode: will prompt for version to RC')
    }
  }
  console.info('')
} else {
  console.info(`Releasing ${curVersion}`)
}

async function upgradeReproApp(newVersion: string) {
  const pkgJsonPath = path.join(process.cwd(), 'repro', 'package.json')

  const pkgJson = await fs.readJSON(pkgJsonPath)
  pkgJson.version = newVersion
  pkgJson.dependencies.one = newVersion

  await writeJSON(pkgJsonPath, pkgJson, { spaces: 2 })
}

async function getWorkspacePackages() {
  const rootPkg = await fs.readJSON('package.json')
  const workspaceGlobs = rootPkg.workspaces || []
  const packages: { name: string; location: string }[] = []

  for (const pattern of workspaceGlobs) {
    const baseDir = pattern.replace(/\/\*$/, '').replace(/^\.\//, '')
    try {
      const entries = await fs.readdir(baseDir, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const pkgPath = path.join(baseDir, entry.name, 'package.json')
        try {
          const pkg = await fs.readJSON(pkgPath)
          if (pkg.name) {
            packages.push({ name: pkg.name, location: path.join(baseDir, entry.name) })
          }
        } catch {
          // Skip directories without package.json
        }
      }
    } catch {
      // Skip patterns that don't resolve
    }
  }

  return packages
}

async function run() {
  try {
    let version = curVersion

    // ensure we are up to date
    // ensure we are on main (skip for canary and rc releases)
    if (!canary && !isRC) {
      if ((await exec(`git rev-parse --abbrev-ref HEAD`)).stdout.trim() !== 'main') {
        throw new Error(`Not on main`)
      }
      if (!dirty && !rePublish && !finish) {
        await spawnify(`git pull --rebase origin main`)
      }
    }

    const packagePaths = await getWorkspacePackages()

    const allPackageJsons = (
      await Promise.all(
        packagePaths
          .filter((i) => i.location !== '.' && !i.name.startsWith('@takeout'))
          .flatMap(async ({ name, location }) => {
            const cwd = path.join(process.cwd(), location)
            const json = await fs.readJSON(path.join(cwd, 'package.json'))
            const item = {
              name,
              cwd,
              json,
              path: path.join(cwd, 'package.json'),
              directory: location,
            }

            if (json.alsoPublishAs) {
              console.info(
                ` ${name}: Also publishing as ${json.alsoPublishAs.join(', ')}`
              )
              return [
                item,
                ...json.alsoPublishAs.map((name: string) => ({
                  ...item,
                  json: { ...json, name },
                  name,
                })),
              ]
            }

            return [item]
          })
      )
    )
      .flat()
      .filter((x) => !x.json['skipPublish'])

    const packageJsons = allPackageJsons
      .filter((x) => {
        return !x.json.private
      })
      // slow things last
      .sort((a, b) => {
        if (a.name.includes('font-') || a.name.includes('-icons')) {
          return 1
        }
        return -1
      })

    if (!finish) {
      console.info(
        `Publishing in order:\n\n${packageJsons.map((x) => x.name).join('\n')}`
      )
    }

    async function checkDistDirs() {
      await Promise.all(
        packageJsons.map(async ({ cwd, json }) => {
          const distDir = join(cwd, 'dist')
          if (!json.scripts || json.scripts.build === 'true') {
            return
          }
          if (!(await fs.pathExists(distDir))) {
            console.warn('no dist dir!', distDir)
            process.exit(1)
          }
        })
      )
    }
    if (tamaguiGitUser) {
      await spawnify(`git config --global user.name 'Tamagui'`)
      await spawnify(`git config --global user.email 'tamagui@users.noreply.github.com`)
    }

    if (!finish) {
      let answer: { version: string }

      if (isCI || skipVersion) {
        answer = { version: nextVersion! }
      } else if (isRC && !isCurrentRC) {
        // New RC - prompt for which version to RC
        const baseVersion = curVersion.replace(/-.*$/, '') // strip any existing prerelease
        const [major, minor, patch] = baseVersion.split('.').map(Number)

        const rcChoices = [
          {
            title: `${major}.${minor + 1}.0-rc.1 (next minor)`,
            value: `${major}.${minor + 1}.0-rc.1`,
          },
          {
            title: `${major}.${minor}.${patch + 1}-rc.1 (next patch)`,
            value: `${major}.${minor}.${patch + 1}-rc.1`,
          },
          { title: `${major + 1}.0.0-rc.1 (next major)`, value: `${major + 1}.0.0-rc.1` },
        ]

        const rcAnswer = await prompts({
          type: 'select',
          name: 'version',
          message: 'Which version to release as RC?',
          choices: rcChoices,
        })

        answer = rcAnswer
      } else {
        answer = await prompts({
          type: 'text',
          name: 'version',
          message: 'Version?',
          initial: nextVersion,
        })
      }

      version = skipBlockedVersions(answer.version)
      console.info('Next:', version, '\n')
    }

    console.info('install and build')

    if (!rePublish && !finish) {
      await spawnify(`bun install`)
    }

    // run quick checks first to fail fast
    if (!finish && !skipTest) {
      console.info('run checks')
      await spawnify(`bun run lint`)
      await spawnify(`bun run check`)
      await spawnify(`bun run typecheck`)
    }

    if (!skipBuild && !finish) {
      await spawnify(`bun run build`)
      await checkDistDirs()
    }

    // run tests after build
    if (!finish && !skipTest) {
      console.info('run tests')
      await spawnify(`bun run test`)
      if (!skipNativeTest) {
        await spawnify(`bun run test-ios`)
      }
    }

    if (!dirty && !dryRun && !rePublish) {
      const out = await exec(`git status --porcelain`)
      if (out.stdout) {
        throw new Error(`Has unsaved git changes: ${out.stdout}`)
      }
    }

    if (!skipVersion && !finish) {
      await Promise.all(
        allPackageJsons.map(async ({ json, path }) => {
          // Skip packages that opt out of version bumping (e.g., test containers for native build caching)
          if (json.skipVersion) {
            return
          }

          const next = { ...json }

          next.version = version

          for (const field of [
            'dependencies',
            'devDependencies',
            'optionalDependencies',
            'peerDependencies',
          ]) {
            const nextDeps = next[field]
            if (!nextDeps) continue
            for (const depName in nextDeps) {
              if (!nextDeps[depName].startsWith('workspace:')) {
                if (allPackageJsons.some((p) => p.name === depName)) {
                  nextDeps[depName] = version
                }
              }
            }
          }

          await writeJSON(path, next, { spaces: 2 })
        })
      )

      await upgradeReproApp(version)
    }

    if (!finish && dryRun) {
      console.info(`Dry run, exiting before publish`)
      return
    }

    if (!finish && !rePublish) {
      await spawnify(`git diff`)
    }

    if (!isCI) {
      const { confirmed } = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: 'Ready to publish?',
      })

      if (!confirmed) {
        process.exit(0)
      }
    }

    if (!finish && !skipPublish) {
      if (confirmFinalPublish) {
        const { confirmed } = await prompts({
          type: 'confirm',
          name: 'confirmed',
          message: 'Ready to publish?',
        })
        if (!confirmed) {
          console.info(`Not confirmed, can re-run with --republish to try again`)
          process.exit(0)
        }
      }
    }

    if (!finish) {
      const tmpDir = `/tmp/one-publish`
      await fs.remove(tmpDir)
      await ensureDir(tmpDir)

      // if all successful, re-tag as latest
      await pMap(
        packageJsons,
        async ({ name, cwd }) => {
          const publishTag = canary
            ? 'canary'
            : version.includes('-rc.')
              ? 'rc'
              : undefined
          const publishOptions = [publishTag && `--tag ${publishTag}`]
            .filter(Boolean)
            .join(' ')

          // Copy to temp directory and replace workspace:* with versions
          const tmpPackageDir = join(tmpDir, name.replace('/', '_'))
          await fs.copy(cwd, tmpPackageDir, {
            filter: (src) => {
              // exclude node_modules to avoid symlink issues
              return !src.includes('node_modules')
            },
          })

          // replace workspace:* with version in temp copy
          const pkgJsonPath = join(tmpPackageDir, 'package.json')
          const pkgJson = await fs.readJSON(pkgJsonPath)
          for (const field of [
            'dependencies',
            'devDependencies',
            'optionalDependencies',
            'peerDependencies',
          ]) {
            if (!pkgJson[field]) continue
            for (const depName in pkgJson[field]) {
              if (pkgJson[field][depName].startsWith('workspace:')) {
                pkgJson[field][depName] = version
              }
            }
          }
          await writeJSON(pkgJsonPath, pkgJson, { spaces: 2 })

          const filename = `${name.replace('/', '_')}-package.tmp.tgz`
          const absolutePath = `${tmpDir}/${filename}`
          await spawnify(`npm pack --pack-destination ${tmpDir}`, {
            cwd: tmpPackageDir,
            avoidLog: true,
          })

          // npm pack creates a file with the package name, rename it to our expected name
          const npmFilename = `${name.replace('@', '').replace('/', '-')}-${version}.tgz`
          await fs.rename(join(tmpDir, npmFilename), absolutePath)

          const publishCommand = ['npm publish', absolutePath, publishOptions]
            .filter(Boolean)
            .join(' ')

          console.info(`Publishing ${name}: ${publishCommand}`)

          await spawnify(publishCommand, {
            cwd: tmpDir,
          }).catch((err) => console.error(err))
        },
        {
          concurrency: 15,
        }
      )

      console.info(`✅ Published\n`)
    }

    if (!skipFinish) {
      // then git tag, commit, push
      if (!finish) {
        await spawnify(`bun install`)
      }

      const tagPrefix = canary ? 'canary' : 'v'
      const gitTag = `${tagPrefix}${version}`

      await finishAndCommit()

      async function finishAndCommit(cwd = process.cwd()) {
        if (!rePublish || reRun || finish) {
          await spawnify(`git add -A`, { cwd })

          await spawnify(`git commit -m ${gitTag}`, { cwd, allowFail: finish })

          await spawnify(`git tag ${gitTag}`, { cwd, allowFail: finish })

          if (!canary) {
            if (!dirty) {
              // pull once more before pushing so if there was a push in interim we get it
              await spawnify(`git pull --rebase origin HEAD`, { cwd })
            }

            await spawnify(`git push origin head`, { cwd, allowFail: finish })
            await spawnify(`git push origin ${gitTag}`, { cwd })
          }

          console.info(`✅ ${canary ? 'Tagged locally' : 'Pushed and versioned'}\n`)
        }
      }

      // console.info(`All done, cleanup up in...`)
      // await sleep(2 * 1000)
      // // then remove old prepub tag
      // await pMap(
      //   packageJsons,
      //   async ({ name, cwd }) => {
      //     await spawnify(`npm dist-tag remove ${name}@${version} prepub`, {
      //       cwd,
      //     }).catch((err) => console.error(err))
      //   },
      //   {
      //     concurrency: 20,
      //   }
      // )
    }

    console.info(`✅ Done\n`)
  } catch (err) {
    console.info('\nError:\n', err)
    process.exit(1)
  }
}

run()
