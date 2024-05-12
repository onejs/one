/* eslint-disable no-console */
import { join } from 'node:path'
import path from 'path'

import FSExtra from 'fs-extra'
import pMap from 'p-map'
import prompts from 'prompts'
import { exec } from './exec'

// avoid emitter error
process.setMaxListeners(0)

// --resume would be cool here where it stores the last failed step somewhere and tries resuming

// for failed publishes that need to re-run
const confirmFinalPublish = process.argv.includes('--confirm-final-publish')
const reRun = process.argv.includes('--rerun')
const rePublish = reRun || process.argv.includes('--republish')
const finish = process.argv.includes('--finish')

const canary = process.argv.includes('--canary')
const skipVersion = finish || rePublish || process.argv.includes('--skip-version')
const patch = process.argv.includes('--patch')
const dirty = process.argv.includes('--dirty')
const skipPublish = process.argv.includes('--skip-publish')
const skipTest =
  rePublish || process.argv.includes('--skip-test') || process.argv.includes('--skip-tests')
const skipBuild = rePublish || process.argv.includes('--skip-build')
const dryRun = process.argv.includes('--dry-run')
const isCI = process.argv.includes('--ci')

const curVersion = FSExtra.readJSONSync('./packages/vxrn/package.json').version

const nextVersion = (() => {
  if (rePublish) {
    return curVersion
  }

  const plusVersion = skipVersion ? 0 : 1
  const curPatch = +curVersion.split('.')[2] || 0
  const patchVersion = patch ? curPatch + plusVersion : 0
  const curMinor = +curVersion.split('.')[1] || 0
  const minorVersion = curMinor + (patch || canary ? 0 : plusVersion)
  const next = `0.${minorVersion}.${patchVersion}`

  if (canary) {
    return `${next}-${Date.now()}`
  }

  return next
})()

if (!finish) {
  if (!skipVersion) {
    console.info('Publishing version:', nextVersion, '\n')
  } else {
    console.info(`Re-publishing ${curVersion}`)
  }
}

async function run() {
  try {
    let version = curVersion

    // ensure we are up to date
    // ensure we are on main
    if (!canary) {
      if ((await exec(`git rev-parse --abbrev-ref HEAD`)).trim() !== 'main') {
        throw new Error(`Not on main`)
      }
      if (!dirty && !rePublish) {
        await exec(`git pull --rebase origin main`)
      }
    }

    const workspaces = (await exec(`yarn workspaces list --json`)).trim().split('\n')
    const packagePaths = workspaces.map((p) => JSON.parse(p)) as {
      name: string
      location: string
    }[]

    const packageJsons = (
      await Promise.all(
        packagePaths
          .filter((i) => i.location !== '.')
          .map(async ({ name, location }) => {
            const cwd = path.join(process.cwd(), location)
            const json = await FSExtra.readJSON(path.join(cwd, 'package.json'))
            return {
              name,
              cwd,
              json,
              path: path.join(cwd, 'package.json'),
              directory: location,
            }
          })
      )
    ).filter((pkg) => !pkg.json.private && !pkg.json.skipRelease)

    console.info(`Publishing in order:\n\n${packageJsons.map((x) => x.name).join('\n')}`)

    async function checkDistDirs() {
      await Promise.all(
        packageJsons.map(async ({ cwd, json }) => {
          const distDir = join(cwd, 'dist')
          if (!json.scripts || json.scripts.build === 'true') {
            return
          }
          if (!(await FSExtra.pathExists(distDir))) {
            console.warn('no dist dir!', distDir)
            process.exit(1)
          }
        })
      )
    }

    const answer =
      isCI || skipVersion
        ? { version: nextVersion }
        : await prompts({
            type: 'text',
            name: 'version',
            message: 'Version?',
            initial: nextVersion,
          })

    version = answer.version

    console.info('install and build')

    if (!rePublish) {
      await exec(`yarn install`)
    }

    if (!skipBuild) {
      await exec(`yarn build`)
      await checkDistDirs()
    }

    console.info('run checks')

    if (!finish) {
      if (!skipTest) {
        await exec(`yarn fix`)
        await exec(`yarn lint`)
        await exec(`yarn check`)
        await exec(`yarn test`)
      }
    }

    if (!dirty && !dryRun && !rePublish) {
      const out = await exec(`git status --porcelain`)
      if (out) {
        throw new Error(`Has unsaved git changes: ${out}`)
      }
    }

    if (!skipVersion && !finish) {
      await Promise.all(
        packageJsons.map(async ({ json, path }) => {
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
              if (packageJsons.some((p) => p.name === depName)) {
                nextDeps[depName] = version
              }
            }
          }

          await FSExtra.writeJSON(path, next, { spaces: 2 })
        })
      )
    }

    if (!finish && dryRun) {
      console.info(`Dry run, exiting before publish`)
      return
    }

    if (!finish && !rePublish) {
      await exec(`git diff`)
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

    if (!finish && !skipPublish && !rePublish) {
      const erroredPackages: { name: string }[] = []

      // publish with tag

      await pMap(
        packageJsons,
        async (pkg) => {
          const { cwd, name } = pkg
          console.info(`Publish ${name}`)

          // check if already published first as its way faster for re-runs
          let versionsOut = ''
          try {
            versionsOut = await exec(`npm view ${name} versions --json`, {})
            if (versionsOut) {
              const allVersions = JSON.parse(versionsOut.trim().replaceAll(`\n`, ''))
              const latest = allVersions[allVersions.length - 1]

              if (latest === nextVersion) {
                console.info(`Already published, skipping`)
                return
              }
            }
          } catch (err) {
            if (`${err}`.includes(`404`)) {
              // fails if never published before, ok
            } else {
              if (`${err}`.includes(`Unexpected token`)) {
                console.error(`Bad JSON? ${versionsOut}`)
              }
              throw err
            }
          }

          try {
            await exec(`npm publish --tag prepub --access public`, {
              cwd,
            })
            console.info(` 📢 pre-published ${name}`)
          } catch (err: any) {
            // @ts-ignore
            if (err.includes(`403`)) {
              console.info('Already published, skipping')
              return
            }
            console.error(`Error publishing!`, `${err}`)
          }
        },
        {
          concurrency: 5,
        }
      )

      console.info(`✅ Published under dist-tag "prepub" (${erroredPackages.length} errors)\n`)
    }

    if (!finish) {
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

    if (rePublish) {
      // if all successful, re-tag as latest
      await pMap(
        packageJsons,
        async ({ name, cwd }) => {
          const tag = canary ? ` --tag canary` : ''

          console.info(`Publishing ${name}${tag}`)

          await exec(`npm publish${tag}`, {
            cwd,
          }).catch((err) => console.error(err))
        },
        {
          concurrency: 15,
        }
      )
    } else {
      const distTag = canary ? 'canary' : 'latest'

      // if all successful, re-tag as latest (try and be fast)
      await pMap(
        packageJsons,
        async ({ name, cwd }) => {
          await exec(`npm dist-tag add ${name}@${version} ${distTag}`, {
            cwd,
          }).catch((err) => console.error(err))
        },
        {
          concurrency: 20,
        }
      )
    }

    console.info(`✅ Published\n`)

    // then git tag, commit, push
    if (!finish) {
      await exec(`yarn fix`)
      await exec(`yarn install`)
    }

    const tagPrefix = canary ? 'canary' : 'v'
    const gitTag = `${tagPrefix}${version}`

    if (!rePublish || reRun || finish) {
      await exec(`git add -A`)
      await exec(`git commit -m ${gitTag}`)
      await exec(`git tag ${gitTag}`)

      if (!dirty) {
        // pull once more before pushing so if there was a push in interim we get it
        await exec(`git pull --rebase origin main`)
      }

      await exec(`git push origin head`)
      await exec(`git push origin ${gitTag}`)
      console.info(`✅ Pushed and versioned\n`)
    }

    console.info(`✅ Done\n`)
  } catch (err) {
    console.error('\nError:\n', err)
    process.exit(1)
  }
}

run()
