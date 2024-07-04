import type { Hono } from 'hono'
import type { AfterBuildProps as VXRNAfterBuildProps, VXRNOptions } from 'vxrn'

export namespace VXS {
  export type Options = Omit<VXRNOptions, keyof PluginOptions> & PluginOptions

  export type RouteMode = 'ssg' | 'spa'

  export type RouteOptions = {
    routeModes?: Record<string, VXS.RouteMode>
  }

  export type PluginOptions = {
    redirects?: Redirects

    shouldIgnore?: (req: Request) => boolean
    disableSSR?: boolean
    afterBuild?: (props: AfterBuildProps) => void | Promise<void>

    afterServerStart?:
      | ((options: Options, server: Hono) => void | Promise<void>)
      | ((
          options: Options,
          server: Hono,
          buildInfo: AfterServerStartBuildInfo
        ) => void | Promise<void>)
  }

  export type Redirect = {
    source: string
    destination: string
    permanent: boolean
  }

  export type Redirects = Redirect[]

  export type AfterServerStartBuildInfo = Pick<AfterBuildProps, 'routeMap' | 'builtRoutes'>

  export type AfterBuildProps = VXRNAfterBuildProps & {
    routeMap: Record<string, string>
    builtRoutes: RouteBuildInfo[]
  }

  export type RouteBuildInfo = {
    path: string
    htmlPath: string
    clientJsPath: string
    params: Object
    loaderData: any
    preloads: string[]
  }
}
