import type { Hono } from 'hono'
import type { AfterBuildProps, VXRNOptions } from 'vxrn'

export type VXSOptions = Omit<VXRNOptions, keyof VXSPluginOptions> & VXSPluginOptions

export type VXSPluginOptions = {
  shouldIgnore?: (req: Request) => boolean
  disableSSR?: boolean
  afterBuild?: (props: VXSAfterBuildProps) => void | Promise<void>

  afterServerStart?:
    | ((options: VXSOptions, server: Hono) => void | Promise<void>)
    | ((
        options: VXSOptions,
        server: Hono,
        buildInfo: AfterServerStartBuildInfo
      ) => void | Promise<void>)
}

export type AfterServerStartBuildInfo = Pick<VXSAfterBuildProps, 'routeMap' | 'builtRoutes'>

export type VXSAfterBuildProps = AfterBuildProps & {
  routeMap: Record<string, string>
  builtRoutes: VXSRouteBuildInfo[]
}

export type VXSRouteBuildInfo = {
  path: string
  htmlPath: string
  clientJsPath: string
  params: Object
  loaderData: any
  preloads: string[]
}
