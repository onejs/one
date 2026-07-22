import path from 'node:path'
import * as proc from 'node:child_process'
import { join } from 'node:path'
import { promisify } from 'node:util'
import fs, { ensureDir, writeJson, writeJSON } from 'fs-extra'
import pMap from 'p-map'
import prompts from 'prompts'
import { spawnify } from './spawnify'
import blockedVersions from './blocked-versions.json'
import { ensureNpmAuthentication, publishPackagesWithAuthProbe } from './release-publish'

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
const execFile = promisify(proc.execFile)
export const spawn = proc.spawn

// for failed publishes that need to re-run
const confirmFinalPublish = process.argv.includes('--confirm-final-publish')
const reRun = process.argv.includes('--rerun')
const rePublish = reRun || process.argv.includes('--republish')
const finish = process.argv.includes('--finish')

// convenience flags
const skipAll = process.argv.includes('--skip-all')
const undocumented = process.argv.includes('--undocumented')

const canary = process.argv.includes('--canary')
const isRC = process.argv.includes('--rc')
const skipVersion = finish || rePublish || process.argv.includes('--skip-version')
const shouldPatch = process.argv.includes('--patch')
const dirty = finish || rePublish || undocumented || process.argv.includes('--dirty')
const skipPublish = process.argv.includes('--skip-publish')
const skipTest =
  finish ||
  rePublish ||
  skipAll ||
  process.argv.includes('--skip-test') ||
  process.argv.includes('--skip-tests')
const skipNativeTest =
  process.argv.includes('--skip-native-test') ||
  process.argv.includes('--skip-native-tests')
const skipBuild = finish || rePublish || skipAll || process.argv.includes('--skip-build')
const dryRun = process.argv.includes('--dry-run')
const tamaguiGitUser = process.argv.includes('--tamagui-git-user')
const isCI = finish || rePublish || undocumented || process.argv.includes('--ci')
const skipFinish =
  rePublish || skipAll || undocumented || process.argv.includes('--skip-finish')
const skipPush = process.argv.includes('--skip-push')

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
    if (!canary && !isRC && !process.env.CI) {
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

    if (!finish && !skipPublish && !dryRun) {
      await ensureNpmAuthentication({
        env: process.env,
        whoami: async () => {
          await spawnify(`npm whoami`)
        },
        login: async () => {
          console.info('npm is not authenticated. Opening npm login in the browser...')
          await spawnify(`npm login`, { interactive: true })
        },
      })
    }

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
      // frozen so we publish exactly what's locked, never a silently-resolved drift
      await spawnify(`bun install --frozen-lockfile`)
    }

    // security gate: never publish with a known high-severity advisory in the tree.
    // ci uses the same root audit script.
    if (!finish) {
      console.info('run security audit')
      await spawnify(`bun run audit`)
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

    if (!finish && !skipPublish) {
      const tmpDir = `/tmp/one-publish`
      await fs.remove(tmpDir)
      await ensureDir(tmpDir)

      const publishTag = canary ? 'canary' : version.includes('-rc.') ? 'rc' : 'latest'
      const publishOptions = [publishTag && `--tag ${publishTag}`]
        .filter(Boolean)
        .join(' ')

      const prepareOne = async ({ name, cwd }: { name: string; cwd: string }) => {
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
        pkgJson.repository = {
          type: 'git',
          url: 'https://github.com/onejs/one.git',
          directory: path.relative(process.cwd(), cwd),
        }
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

        return path.relative(tmpDir, tmpPackageDir)
      }

      const isPublished = async ({ name }: { name: string }) => {
        try {
          const { stdout } = await execFile(
            'npm',
            ['view', `${name}@${version}`, 'version', '--json'],
            { cwd: tmpDir }
          )
          return JSON.parse(stdout.trim()) === version
        } catch (error) {
          const message = String(error)
          if (/E404|404 Not Found|is not in this registry/i.test(message)) {
            return false
          }
          throw new Error(`Could not verify ${name}@${version} on npm:\n${message}`)
        }
      }

      const publishResult = await publishPackagesWithAuthProbe({
        packages: packageJsons,
        isPublished,
        publish: async (pending) => {
          const workspaces = await pMap(pending, prepareOne, { concurrency: 8 })
          await writeJSON(
            join(tmpDir, 'package.json'),
            {
              name: 'one-release',
              private: true,
              workspaces,
            },
            { spaces: 2 }
          )

          const webAuthCache = join(process.cwd(), 'scripts/cache-npm-webauth.cjs')
          const nodeOptions = [process.env.NODE_OPTIONS, `--require=${webAuthCache}`]
            .filter(Boolean)
            .join(' ')
          const publishCommand = [
            'npm publish --workspaces --ignore-scripts --access public',
            publishOptions,
            '--quiet',
          ]
            .filter(Boolean)
            .join(' ')

          console.info(`Publishing ${pending.map((pkg) => pkg.name).join(', ')}`)
          await spawnify(publishCommand, {
            cwd: tmpDir,
            env: { ...process.env, NODE_OPTIONS: nodeOptions },
            interactive: true,
          })
        },
      })

      if (publishResult.failed.length > 0) {
        throw new Error(
          `Failed to publish ${publishResult.failed.length} packages:\n${publishResult.failed.join('\n')}\n\nRe-run with --republish to retry.`
        )
      }

      console.info(`✅ Published\n`)

      // restore package.json files for undocumented releases
      if (undocumented) {
        console.info('Restoring package.json files...')
        await spawnify(`git checkout -- **/package.json`)
        console.info(`✅ Restored package.json files (undocumented release)\n`)
      }
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

          if (!canary) {
            if (!dirty) {
              // pull once more before pushing so if there was a push in interim we get it
              await spawnify(`git pull --rebase origin HEAD`, { cwd })
            }
          }

          await spawnify(`git tag ${gitTag}`, { cwd, allowFail: finish })

          if (!canary && !skipPush) {
            await spawnify(`git push origin head`, { cwd, allowFail: finish })
            await spawnify(`git push origin ${gitTag}`, { cwd })
          }

          console.info(
            `✅ ${canary || skipPush ? 'Versioned locally' : 'Pushed and versioned'}\n`
          )
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

// --into <dir>: quick local release, packs each package and unpacks into target node_modules
const intoIdx = process.argv.indexOf('--into')
if (intoIdx !== -1) {
  const targetArg = process.argv[intoIdx + 1]
  if (!targetArg) {
    console.error('Missing directory argument for --into')
    process.exit(1)
  }
  const targetDir = path.resolve(targetArg.replace(/^~/, process.env.HOME!))

  ;(async () => {
    const packages = await getWorkspacePackages()
    const tmpDir = `/tmp/one-release-into`
    await ensureDir(tmpDir)

    await spawnify(`bun run build`, {
      avoidLog: true,
    })

    let released = 0

    await pMap(
      packages,
      async ({ name, location }) => {
        const destDir = join(targetDir, 'node_modules', name)
        if (!(await fs.pathExists(destDir))) return

        const cwd = path.resolve(location)

        try {
          await spawnify(`npm pack --ignore-scripts --pack-destination ${tmpDir}`, {
            cwd,
            avoidLog: true,
          })

          // npm pack names files based on version in package.json, find the actual file
          const files = await fs.readdir(tmpDir)
          const prefix = name.replace('@', '').replace('/', '-')
          const packed = files.find((f) => f.startsWith(prefix) && f.endsWith('.tgz'))

          if (!packed) {
            console.warn(`  skip ${name}: pack produced no tgz`)
            return
          }

          const actualTgz = join(tmpDir, packed)

          // clear destination and extract
          await spawnify(`tar -xzf ${actualTgz} -C ${destDir} --strip-components=1`, {
            avoidLog: true,
          })

          await fs.remove(actualTgz)
          released++
          console.info(`  ✓ ${name}`)
        } catch (err) {
          console.warn(`  ✗ ${name}: ${err}`)
        }
      },
      { concurrency: 10 }
    )

    console.info(`\n✅ Released ${released} packages into ${targetDir}`)
    process.exit(0)
  })()
} else {
  run()
}
