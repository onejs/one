import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadUserOneOptions } from '../vite/loadConfig'

export async function run(args: { simulator?: string; udid?: string }) {
  const root = process.cwd()

  // resolve the app's dev server port from its vite config so the launched
  // app points at the real dev server (vxrn passes it as the community cli
  // --port with --no-packager, which reuses the already-running server)
  const options = await loadUserOneOptions('serve', true).catch(() => null)
  const port = options?.config?.config?.server?.port ?? 8081

  // pod install bakes RCT_METRO_PORT into the generated xcconfig, so it must
  // be set before prebuild runs, not just before the build.
  process.env.RCT_METRO_PORT ??= String(port)

  // the community cli builds the checked-in native project; without one it
  // crashes, so generate it first through the same prebuild this command
  // would otherwise require the user to run by hand.
  if (!existsSync(join(root, 'ios'))) {
    const { run: prebuildRun } = await import('./prebuild')
    await prebuildRun({ platform: 'ios' })
  }

  const { runIos } = await import('vxrn')

  await runIos({
    root,
    port,
    simulator: args.simulator,
    udid: args.udid,
  })
}
