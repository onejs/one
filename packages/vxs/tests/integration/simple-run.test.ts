import { copy, ensureDir, pathExists } from 'fs-extra'
import * as path from 'node:path'
import { rootTemporaryDirectory } from 'tempy'
import { beforeAll, describe, expect, it } from 'vitest'
import { execSync } from 'node:child_process'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
const shell = require('shelljs')

let tempDirPath
const fixturePath = path.resolve(__dirname, '../../../../examples/basic')

const getCommitHash = () => execSync('git rev-parse HEAD').toString().trim()

const runShellCommand = (command, cwd) => {
  try {
    const { stdout, stderr, code } = shell.exec(command, { cwd, silent: true })
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
  tempDirPath = path.join(rootTemporaryDirectory, '.tmp-test-dirs', commitHash)
  console.log(`Test directory: ${tempDirPath}`)

  if (await pathExists(tempDirPath)) {
    console.log('Reusing existing test directory')
  } else {
    await ensureDir(tempDirPath)
    console.log('Created new test directory')
    // Copy fixture app and install dependencies
    const basicAppDirectory = fixturePath
    console.log({ basicAppDirectory })
    console.log('Copying basic app to test directory')
    await copy(basicAppDirectory, tempDirPath, {
      recursive: true,
      filter: (src) => !src.includes('node_modules'),
    })
    console.log('Copied basic app to test directory')
  }

  console.log('Setting yarn version to stable')
  runShellCommand('yarn set version stable', tempDirPath)

  console.log('Setting yarn node linker to node-modules')
  runShellCommand('yarn config set nodeLinker node-modules', tempDirPath)

  console.log('Installing dependencies')
  runShellCommand('yarn install', tempDirPath)

  console.log(`Adding vxs@portal:${process.cwd()} to the project`)
  runShellCommand(`yarn add vsx@portal:${process.cwd()}`, tempDirPath)

  // List directory contents
  runShellCommand('ls -lash', tempDirPath)

  return async () => {
    runShellCommand('yarn unlink vxs', tempDirPath)
    runShellCommand(`yarn unlink ${process.cwd()}`, tempDirPath)
  }
})

describe('Simple Run Test', () => {
  it('should start the dev server', async () => {
    // Spawn the dev server process
    const devProcess = spawn('yarn', ['dev'], { cwd: tempDirPath })

    let yarnDevOutput = ''
    devProcess.stdout.on('data', (data) => {
      yarnDevOutput += data.toString()
    })

    // Wait for the server to start or timeout
    const maxWaitTime = 3000 // 30 seconds
    const startTime = Date.now()

    while (Date.now() - startTime < maxWaitTime) {
      if (yarnDevOutput.includes('Server running on http://')) {
        break
      }
      await new Promise((resolve) => setTimeout(resolve, 300)) // Wait 1 second before checking again
    }

    // Kill the dev server process
    devProcess.kill()

    // Wait for the process to exit
    await once(devProcess, 'exit')

    // Assert that the output contains the expected string
    expect(yarnDevOutput).toContain('Server running on http://')
  }, 5000) // Increase the test timeout to account for server startup time
})
