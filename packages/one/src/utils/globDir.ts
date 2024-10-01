import Glob from 'fast-glob'

// Used to emulate a context module, but way faster. TODO: May need to adjust the extensions to stay in sync with Metro.
export function globDir(cwd: string) {
  return Glob.sync('**/*.@(ts|tsx|js|jsx)', {
    cwd,
  }).map((p) => './' + normalizePaths(p))
}

function normalizePaths(p: string) {
  return p.replace(/\\/g, '/')
}
