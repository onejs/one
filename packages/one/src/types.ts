import type { One } from './vite/types'

/** The list of input keys will become optional, everything else will remain the same. */
export type PickPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type GlobbedRouteImports = Record<string, () => Promise<unknown>>

export type Endpoint = (req: Request) => Response | string | Object | null

export type RenderApp = (props: RenderAppProps) => Promise<string>

export type LoaderProps<Params extends Object = Record<string, string | string[]>> = {
  path: string
  search?: string
  params: Params
  request?: Request
}

export type RenderAppProps = {
  mode: One.RouteRenderMode
  path: string
  preloads?: string[]
  css?: string[]
  loaderServerData?: any
  loaderData?: any
  loaderProps?: LoaderProps
  routePreloads?: Record<string, string>
}
