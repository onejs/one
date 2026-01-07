import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dev } from './dev'

async function getLatestVersion(packageName: string) {
  const require = createRequire(import.meta.url)
  const _confuseDepCheck = require
  const packageJson = _confuseDepCheck('one/package.json')
  const currentVersion = packageJson.version

  try {
    const response = await fetch(`https://registry.npmjs.org/${packageName}`)
    const data = await response.json()
    const latest = data['dist-tags'].latest

    if (latest && currentVersion !== latest) {
      // Step 4: Log the message
      console.info(`\n❶ Update available: ${currentVersion} → ${latest}`)
      console.info(
        'Run "npx one@latest" or "npm install -g one@latest" to update globally.\n'
      )
    }
  } catch (error) {
    console.error('Failed to fetch the latest version:', error)
  }
}

export async function cliMain(args: { name?: string } = {}) {
  // async as the flow takes a minute anyway
  void getLatestVersion('one')

  if (existsSync('vite.config.ts')) {
    // Inside existing app, let's just run the damn thing
    await dev({})
    process.exit(0)
  }

  const { create } = await import('create-vxrn/create')
  await create(args)
}
