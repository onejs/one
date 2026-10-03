import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadUserOneOptions } from '../vite/loadConfig'

export async function run(args: {}) {
  const root = process.cwd()

  // same guarantee as run:ios: never hand the community cli a project
  // without generated android sources.
  if (!existsSync(join(root, 'android'))) {
    const { run: prebuildRun } = await import('./prebuild')
    await prebuildRun({ platform: 'android' })
  }

  const { runAndroid } = await import('vxrn')

  // resolve the app's dev server port from its vite config so the launched
  // app points at the real dev server (vxrn passes it as the community cli
  // --port with --no-packager, which reuses the already-running server)
  const options = await loadUserOneOptions('serve', true).catch(() => null)

  await runAndroid({
    root,
    port: options?.config?.config?.server?.port,
  })
}
