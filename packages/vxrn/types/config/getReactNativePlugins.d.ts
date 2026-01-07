import {
  ExpoManifestRequestHandlerPluginPluginOptions,
  type MetroPluginOptions,
} from '@vxrn/vite-plugin-metro'
import type { VXRNOptionsFilled } from './getOptionsFilled'
export declare function getReactNativePlugins(
  config?: Partial<
    Pick<VXRNOptionsFilled, 'cacheDir' | 'debugBundle' | 'debugBundlePaths' | 'entries'>
  >,
  {
    metro,
  }?: {
    /** Passing a non-null value will enable metro mode */
    metro?: (MetroPluginOptions & ExpoManifestRequestHandlerPluginPluginOptions) | null
  }
):
  | import('vite').PluginOption[]
  | (
      | import('vite').Plugin<any>
      | {
          name: string
          configResolved(
            this: import('vite').MinimalPluginContextWithoutEnvironment,
            conf: import('vite').ResolvedConfig
          ): void
        }
    )[]
//# sourceMappingURL=getReactNativePlugins.d.ts.map
