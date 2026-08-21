import Glob from 'fast-glob'

// Used to emulate a context module, but way faster. TODO: May need to adjust the extensions to stay in sync with Metro.
export function globDir(cwd: string, glob = '**/*.@(ts|tsx|js|jsx)') {
  return Glob.sync(glob, {
    cwd,
    // fast-glob does not skip node_modules on its own, and a dependency's files
    // are never this directory's own content. Without this, a dep patch keyed
    // `**/*.js` reaches into the package's nested node_modules and rewrites a
    // package it was never meant to touch: patching react-native-reanimated
    // re-printed all 49 files of its nested semver@7.8.5, leaving that copy
    // different from the 46 others installed elsewhere in the same tree.
    ignore: ['**/node_modules/**'],
  }).map((p) => './' + normalizePaths(p))
}

function normalizePaths(p: string) {
  return p.replace(/\\/g, '/')
}
