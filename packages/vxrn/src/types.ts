import type { OutputAsset, OutputChunk, TreeshakingOptions, TreeshakingPreset } from 'rollup'
import type { UserConfig } from 'vite'

type RollupOutputList = [OutputChunk, ...(OutputChunk | OutputAsset)[]]

export type BuildArgs = { step?: string; only?: string; analyze?: boolean }

export type AfterBuildProps = {
  options: VXRNOptions
  clientOutput: RollupOutputList
  serverOutput: RollupOutputList
  webBuildConfig: UserConfig
  serverBuildConfig: UserConfig
  buildArgs?: BuildArgs
  clientManifest: {
    // app/[user].tsx
    [key: string]: ClientManifestEntry
  }
}

export type ClientManifestEntry = {
  file: string // assets/_user_-Bg0DW2rm.js
  src?: string // app/[user].tsx
  isDynamicEntry?: boolean // true for import.meta.globbed
  isEntry?: boolean // true for index.html
  name: string // _user_
  imports: string[]
  css?: string[]
}

export type RollupTreeshakeOptions = boolean | TreeshakingPreset | TreeshakingOptions

export type VXRNBuildOptions = {
  /**
   * Control the output format of the server build
   * @default esm
   */
  outputFormat?: 'cjs' | 'esm'

  treeshake?: RollupTreeshakeOptions
}

export type VXRNServePlatform = 'node' | 'vercel' | 'cloudflare'

export type VXRNOptions = {
  /**
   * Root directory, your entries.native and entires.web will resolve relative to this
   */
  root?: string

  /**
   * Whether to bundle for development or production
   */
  mode?: 'development' | 'production'

  /**
   * The entry points to your app. For web, it defaults to using your `root` to look for an index.html
   *
   * Defaults:
   *   native: ./src/entry-native.tsx
   */
  entries?: {
    native?: string
    web?: string
  }

  /**
   * Settings only apply when running `vxrn build`
   */
  build?: {
    /**
     * Can disable web server side build
     * @default true
     */
    server?: boolean | VXRNBuildOptions

    /**
     * When on, outputs a report.html file with client js bundle analysis
     * @default false
     */
    analyze?: boolean
  }

  server?: {
    host?: string
    port?: number
    compress?: boolean
    cacheHeaders?: 'off'
    loadEnv?: boolean

    /**
     * Uses mkcert to create a self-signed certificate
     */
    https?: boolean

    /**
     * Determines the Hono platform adapter
     *   node: https://github.com/honojs/node-server
     *   vercel: https://hono.dev/docs/getting-started/vercel
     */
    platform?: VXRNServePlatform
  }

  /**
   * Whether to clean cache directories on startup
   */
  clean?: boolean
}

export type HMRListener = (update: { file: string; contents: string }) => void
