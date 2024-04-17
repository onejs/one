import { sync as globSync } from 'glob'
import type { App } from 'h3'
import { join } from 'node:path'
// @ts-ignore
import { createRoutesManifest } from '@vxrn/expo-router/routes-manifest'

// TODO move out

export function createExpoServer(root: string, app: App) {
  const routePaths = getRoutePaths(join(root, 'app'))
  const manifest = createRoutesManifest(routePaths)
  console.info('manifest', manifest)

  // TODO create serve the api routes
  // see github/expo/packages/@expo/cli/src/start/server/metro/MetroBundlerDevServer.ts
}

// Used to emulate a context module, but way faster. TODO: May need to adjust the extensions to stay in sync with Metro.
export function getRoutePaths(cwd: string) {
  return globSync('**/*.@(ts|tsx|js|jsx)', {
    cwd,
  }).map((p) => './' + normalizePaths(p))
}

function normalizePaths(p: string) {
  return p.replace(/\\/g, '/')
}
