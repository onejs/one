import { dirname, join, relative } from 'node:path'

import FSExtra from 'fs-extra'

export async function getVitePath(
  rootPath: string,
  importer: string,
  moduleName: string,
  resolver: (moduleName: string, importer: string) => Promise<string | undefined>,
  resolverWithPlugins: (moduleName: string, importer: string) => Promise<string | undefined>,
  absolute = false
) {
  // our virtual modules
  if (moduleName === 'react-native') {
    return 'react-native'
  }
  if (moduleName === 'react') {
    return 'react'
  }
  if (moduleName === 'react/jsx-runtime') {
    return 'react/jsx-runtime'
  }
  if (moduleName === 'react/jsx-dev-runtime') {
    return 'react/jsx-dev-runtime'
  }
  if (moduleName.includes('one/dist/esm/index')) {
    return 'one'
  }

  if (moduleName[0] === '.') {
    const rootAt = importer.indexOf(rootPath)
    const base = join(dirname(importer.slice(rootAt)), moduleName)
    return base + '.js'
  }
  if (moduleName === 'vxs') {
    // TODO hardcoded
    return 'vxs'
  }
  if (moduleName === 'one') {
    // TODO hardcoded
    return 'one'
  }

  const sourceFile = join(process.cwd(), 'index.js')
  const resolved =
    (await resolver(moduleName, sourceFile)) ||
    (await resolverWithPlugins(
      moduleName,
      importer // @zetavg: we cannot use `sourceFile` here since it'll always end with `.js`, and plugins such as `vite-tsconfig-paths` may simply ignore if it doesn't end with `.ts` or `.tsx` (see: https://github.com/aleclarson/vite-tsconfig-paths/blob/v5.0.0/src/index.ts#L307-L310). Actually IDK why we are using the `sourceFile` but not the `importer` here.
    ))

  // TODO
  if (!resolved) {
    return 'vxs'
  }

  // figure out symlinks
  if (!resolved) {
    throw new Error(
      ` ❌ Path not found ${sourceFile} (rootPath ${rootPath}, importer ${importer}, moduleName ${moduleName})`
    )
  }

  const real = await FSExtra.realpath(resolved)

  let id = real

  // if (!absolute) {
  //   id = relative(importer, real)
  // }

  if (id.endsWith(`/react/jsx-dev-runtime.js`)) {
    id = 'react/jsx-runtime'
  }

  return id
}
