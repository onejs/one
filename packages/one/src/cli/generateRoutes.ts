import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { generateRouteTypes } from '../typed-routes/generateRouteTypes'

export async function run(args: { appDir?: string } = {}) {
  const cwd = process.cwd()

  // Use provided appDir or default to 'app'
  const routerRoot = args.appDir || 'app'
  const appDir = join(cwd, routerRoot)

  if (!existsSync(appDir)) {
    console.error(`Error: App directory not found at ${appDir}`)
    console.error(
      'You can specify a custom directory with: yarn one generate-routes --appDir=<path>'
    )
    process.exit(1)
  }

  const outFile = join(appDir, 'routes.d.ts')

  await generateRouteTypes(outFile, routerRoot, undefined)
}
