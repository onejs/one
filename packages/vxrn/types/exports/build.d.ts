import type { OutputAsset, OutputChunk } from 'rollup'
import type { BuildArgs, VXRNOptions } from '../types'
export declare const build: (
  optionsIn: VXRNOptions,
  buildArgs?: BuildArgs
) => Promise<void | {
  processEnvDefines: {
    [k: string]: string
  }
  options: {
    readonly debugBundlePaths: {
      readonly ios: string
      readonly android: string
    }
    readonly mode: 'development' | 'production'
    readonly clean: false | 'vite'
    readonly root: string
    readonly server: Required<{
      host?: string
      port?: number
      compress?: boolean
      loadEnv?: boolean
    }> & {
      url: string
      protocol: string
    }
    readonly entries: {
      native: string
      readonly web?: string
      readonly server: './src/entry-server.tsx'
    }
    readonly packageJSON: import('pkg-types').PackageJson
    readonly packageVersions:
      | {
          react: string
          reactNative: string
        }
      | undefined
    readonly state: {
      versionHash?: string
    }
    readonly packageRootDir: string
    readonly cacheDir: string
    readonly build?: {
      server?: boolean | import('..').VXRNBuildOptions
      analyze?: boolean
    }
    readonly debugBundle?: string
    readonly debug?: string
  }
  buildArgs: BuildArgs
  serverEntry: string
  clientOutput: any
  serverOutput: [OutputChunk, ...(OutputChunk | OutputAsset)[]] | undefined
  serverBuildConfig: Record<string, any>
  webBuildConfig: Record<string, any>
  clientManifest: any
}>
//# sourceMappingURL=build.d.ts.map
