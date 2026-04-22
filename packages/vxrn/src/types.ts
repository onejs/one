import type { Hono } from 'hono'
import type { OutputAsset, OutputChunk, TreeshakingOptions } from 'rolldown'
import type { FilterPattern, InlineConfig, UserConfig } from 'vite'

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

export type AutoDepOptimizationOptions = {
  exclude?: FilterPattern
  include?: FilterPattern
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

export type RollupTreeshakeOptions = boolean | TreeshakingOptions

export type VXRNBuildOptions = {
  /**
   * Control the output format of the server build
   * @default esm
   */
  outputFormat?: 'cjs' | 'esm'

  treeshake?: RollupTreeshakeOptions

  /**
   * Uses Vite mergeConfig to overwrite any build configuration during build
   */
  config?: InlineConfig

  /**
   * Unify the server-side build. Api routes and middlewares share the SSR
   * server's config (same defines, plugins, externalization rules) instead of
   * deriving from the web/client build. Also drops the blanket
   * `ssr.noExternal: true` so rolldown can externalize what it cannot bundle.
   *
   * This is the direction One is moving — in the next major it becomes the
   * default and api/middleware lose their separate config surfaces entirely.
   * Opt in now to avoid surprise later.
   *
   * @default false
   */
  unified?: boolean
}

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
   * Skip loading .env files during build
   */
  skipEnv?: boolean

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
     * Custom cache-control rules for static assets.
     * Map of glob patterns to Cache-Control header values.
     * Hashed assets (e.g. app-CB4EB78V.js) are always immutable.
     * Unmatched assets default to must-revalidate.
     *
     * @example
     * cacheControl: {
     *   '*.worker.js': 'public, max-age=86400, stale-while-revalidate=604800',
     *   '*.wasm': 'public, max-age=86400',
     *   '/deps-*\/**': 'public, max-age=86400',
     * }
     */
    cacheControl?: Record<string, string>
  }

  /**
   * Whether to clean cache directories on startup
   */
  clean?: boolean | 'vite'

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

type VXRNServeOptionsBase = VXRNOptions['server']

export type VXRNServeOptionsFilled = Required<
  Omit<NonNullable<VXRNServeOptionsBase>, 'cacheControl'>
> &
  Pick<NonNullable<VXRNServeOptionsBase>, 'cacheControl'> & {
    url: string
    protocol: string
  }

export type VXRNServeOptions = VXRNServeOptionsBase & {
  app?: Hono
  outDir?: string
  beforeRegisterRoutes?: (
    options: VXRNServeOptionsFilled,
    app: Hono
  ) => void | Promise<void>
  afterRegisterRoutes?: (
    options: VXRNServeOptionsFilled,
    app: Hono
  ) => void | Promise<void>
}
