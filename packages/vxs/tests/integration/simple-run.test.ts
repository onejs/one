import { copy, ensureDir, pathExists } from 'fs-extra'
import * as path from 'node:path'
import { rootTemporaryDirectory } from 'tempy'
import { beforeAll, describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
const shell = require('shelljs')

let dir

const getCommitHash = () => execSync('git rev-parse HEAD').toString().trim()

const runShellCommand = (command, cwd) => {
  try {
    const { stdout, stderr, code } = shell.exec(command, { cwd, silent: true })
    console.info(stdout)
    if (code !== 0) {
      console.error('Stdout:', stdout)
      console.error('Stderr:', stderr)
      throw new Error(`\n${command}\nCommand failed with exit code ${code}\nStderr: ${stderr}`)
    }
    return stdout
  } catch (error) {
    console.error(`Error executing command: ${command}`)
    throw error
  }
}

beforeAll(async () => {
  const commitHash = getCommitHash()
  dir = path.join(rootTemporaryDirectory, '.tmp-test-dirs', commitHash)
  console.info(`Test directory: ${dir}`)

  if (await pathExists(dir)) {
    console.info('Reusing existing test directory')
  } else {
    await ensureDir(dir)
    console.info('Created new test directory')

    // Copy fixture app and install dependencies
    const basicAppDirectory = path.resolve(__dirname, '../../../../examples/basic')
    await copy(basicAppDirectory, dir)
    runShellCommand('yarn install', dir)
  }

  runShellCommand('yarn set version stable', dir)
  runShellCommand('yarn config set nodeLinker node-modules', dir)
  runShellCommand('yarn unlink vxs', dir)
  runShellCommand(`yarn add vsx@portal:${process.cwd()}`, dir)

  // List directory contents
  runShellCommand('ls -lash', dir)

  return async () => {
    // Clean up function now only unlinks vxs if it was linked
    runShellCommand('yarn unlink vxs', dir)
    runShellCommand(`yarn unlink ${process.cwd()}`, dir)
  }
})

describe('Simple Run Test', () => {
  it('should start the dev server', async () => {
    // Run the dev server
    const yarnDevOutput = runShellCommand('yarn dev', dir)

    // Assert that the output contains "localhost"
    expect(yarnDevOutput).toContain('localhost')
  })
})
