import { existsSync } from 'node:fs'
import { join } from 'node:path'

// prebuild writes the typescript facade of each framework an app imports here
// (codegen/sdk/app.ts), beside the native tables it compiles into the app
export const IOS_FACADES = 'node_modules/.one/ios'

const IMPORT = /^one\/ios\/([A-Za-z_][A-Za-z0-9_]*)$/

// the file `one/ios/<Framework>` resolves to; undefined for any other import
export function resolveIosSdkImport(root: string, source: string, platform: string | null) {
  const match = IMPORT.exec(source)
  if (!match) return
  if (platform !== 'ios') {
    throw new Error(`[one] ${source} is an iOS framework; import it from an .ios.ts file`)
  }
  const file = join(root, IOS_FACADES, `${match[1]}.ts`)
  if (!existsSync(file)) {
    throw new Error(`[one] ${source} has no generated bindings; run one prebuild`)
  }
  return file
}
