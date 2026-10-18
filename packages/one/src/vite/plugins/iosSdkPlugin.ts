import type { Plugin } from 'vite'
import { resolveIosSdkImport } from '../../utils/iosSdkFacade'

// `one/ios/<Framework>` is the generated typescript facade over that
// framework's native table; prebuild writes both, so their entry ids match
export function iosSdkPlugin(platform: 'ios' | 'android', root: string): Plugin {
  return {
    name: 'one:ios-sdk',
    resolveId: {
      filter: { id: /^one\/ios\// },
      handler(source, importer) {
        return resolveIosSdkImport(root, source, platform, importer)
      },
    },
  }
}
