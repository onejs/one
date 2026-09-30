const { existsSync, readFileSync, realpathSync } = require('node:fs')
const path = require('node:path')
const { absorbedPackageNames } = require('./dist/cjs/utils/absorbedPackages.cjs')
// one's own native code autolinks as the `one` dependency. these are its native
// dependencies, which the app does not declare, so they resolve from one.
const bundledNativePackages = [
  '@op-engineering/op-sqlite',
  'react-native-nitro-image',
  'react-native-nitro-modules',
  'react-native-nitro-web-image',
]

// autolinking runs from the app root or its ios/android folder, and resolves
// the app the same way: the nearest package.json above the working directory.
function appRoot() {
  let dir = process.cwd()
  while (!existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir)
    if (parent === dir) throw new Error('[one] react-native-config found no package.json')
    dir = parent
  }
  return dir
}

// the app's installed dependencies at their real paths. community autolinking
// keeps a node_modules symlink in the path, and gradle's `..` walks out of the
// symlink's parent instead of the package's (a workspace whose node_modules
// links to the repo's), so native builds see a directory that does not exist.
function appDependencyRoots(root) {
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  return Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).flatMap((name) => {
    const dir = path.join(root, 'node_modules', name)
    return existsSync(path.join(dir, 'package.json'))
      ? [[name, { root: realpathSync(dir) }]]
      : []
  })
}

const root = appRoot()

module.exports = {
  commands: [...require('vxrn/react-native-commands')],
  dependencies: Object.fromEntries([
    ...appDependencyRoots(root),
    ...bundledNativePackages.map((name) => [
      name,
      {
        root: path.dirname(
          require.resolve(`${name}/package.json`, { paths: [__dirname] })
        ),
      },
    ]),
    // one implements the packages it absorbs natively, so their own native
    // code never links.
    ...absorbedPackageNames(root).map((name) => [
      name,
      { platforms: { ios: null, android: null } },
    ]),
  ]),
}
