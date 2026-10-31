import { existsSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'

// these generated facades ship with One. prebuild compiles the native tables
// on the Mac builder; bundling javascript does not need that builder's SDK.
export const IOS_FACADES = 'dist/esm/ios'

const IMPORT = /^one\/ios\/([A-Za-z_][A-Za-z0-9_]*)$/

// the file `one/ios/<Framework>` resolves to; undefined for any other import
export function resolveIosSdkImport(
  root: string,
  source: string,
  platform: string | null,
  importer: string | undefined
) {
  const match = IMPORT.exec(source)
  if (!match) return
  if (platform !== 'ios') {
    throw new Error(
      `[one] ${source} is an iOS framework; import it from an .ios.ts file (imported by ${importer ?? 'an entry'})`
    )
  }
  const packageRoot = dirname(
    createRequire(join(root, 'package.json')).resolve('one/package.json')
  )
  const file = join(packageRoot, IOS_FACADES, `${match[1]}.native.js`)
  if (!existsSync(file)) {
    throw new Error(
      `[one] ${source} is not included in the installed One SDK bindings (imported by ${importer ?? 'an entry'})`
    )
  }
  return file
}
