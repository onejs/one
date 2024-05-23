import * as Glob from 'glob'
import { createRoutesManifest } from '../server/routes-manifest'

const { sync: globSync } = (Glob['default'] || Glob) as typeof Glob

export function getManifest(root: string) {
  const routePaths = getRoutePaths(root)
  return createRoutesManifest(routePaths, {
    platform: 'web',
  })
}

// Used to emulate a context module, but way faster. TODO: May need to adjust the extensions to stay in sync with Metro.
function getRoutePaths(cwd: string) {
  return globSync('**/*.@(ts|tsx|js|jsx)', {
    cwd,
  }).map((p) => './' + normalizePaths(p))
}

function normalizePaths(p: string) {
  return p.replace(/\\/g, '/')
}
