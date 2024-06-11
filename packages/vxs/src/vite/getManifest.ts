import Glob from 'fast-glob'
import { createRoutesManifest } from '../server/createRoutesManifest'

export function getManifest(root: string) {
  const routePaths = getRoutePaths(root)
  return createRoutesManifest(routePaths, {
    platform: 'web',
  })
}

// Used to emulate a context module, but way faster. TODO: May need to adjust the extensions to stay in sync with Metro.
function getRoutePaths(cwd: string) {
  return Glob.sync('**/*.@(ts|tsx|js|jsx)', {
    cwd,
  }).map((p) => './' + normalizePaths(p))
}

function normalizePaths(p: string) {
  return p.replace(/\\/g, '/')
}
