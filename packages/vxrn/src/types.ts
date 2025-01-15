import type { Hono } from 'hono'
import type { OutputAsset, OutputChunk, TreeshakingOptions, TreeshakingPreset } from 'rollup'
import type { UserConfig } from 'vite'

type RollupOutputList = [OutputChunk, ...(OutputChunk | OutputAsset)[]]

export type Mode = 'dev' | 'prod'

export type BuildArgs = {
  step?: string
  only?: string
  analyze?: boolean
  platform?: 'ios' | 'web' | 'android'
}

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

    /**
     * Whether to run the Vite logic to load .env files before running the server
     * @default false
     */
    loadEnv?: boolean

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

  /**
   * Will output the bundle to a temp file and then serve it from there afterwards allowing you to easily edit the bundle to debug problems.
   * If set to an empty string it will create a random tmp file and log it to console.
   */
  debugBundle?: string

  /**
   * Pass debug options to Vite
   */
  debug?: string
}

export type HMRListener = (update: { file: string; contents: string }) => void

type VXRNServeOptionsBase = VXRNOptions['server'] & {
  platform?: VXRNServePlatform
}

export type VXRNServeOptionsFilled = Required<VXRNServeOptionsBase> & {
  url: string
  protocol: string
}

export type VXRNServeOptions = VXRNServeOptionsBase & {
  beforeRegisterRoutes?: (options: VXRNServeOptionsFilled, app: Hono) => void | Promise<void>
  afterRegisterRoutes?: (options: VXRNServeOptionsFilled, app: Hono) => void | Promise<void>
}
