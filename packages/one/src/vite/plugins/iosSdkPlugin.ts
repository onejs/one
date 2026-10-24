import type { Plugin } from 'vite'
import { resolveIosSdkImport } from '../../utils/iosSdkFacade'

// `one/ios/<Framework>` is the generated typescript facade over that
// framework's native table. One ships the facades; native prebuild uses the
// same generator ABI and signature-based entry ids on the builder's SDK.
export function iosSdkPlugin(
  platform: 'ios' | 'android' | 'macos' | 'linux',
  root: string
): Plugin {
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
