// TODO merge into vite/types

/** The list of input keys will become optional, everything else will remain the same. */
export type PickPartial<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

export type GlobbedRouteImports = Record<string, () => Promise<unknown>>

export type Endpoint = (req: Request) => Response | string | Object | null

export type Options = {
  ignore?: RegExp[]
  preserveApiRoutes?: boolean
  ignoreRequireErrors?: boolean
  ignoreEntryPoints?: boolean
  /* Used to simplify testing for toEqual() comparison */
  internal_stripLoadRoute?: boolean
  /* Used to simplify by skipping the generated routes */
  skipGenerated?: boolean
  importMode?: string
  platformRoutes?: boolean
  platform?: string
}

export type RenderApp = (props: RenderAppProps) => Promise<string>

export type LoaderProps<Params extends Object = Record<string, string>> = {
  path: string
  params: Params
}

export type RenderAppProps = {
  path: string
  preloads?: string[]
  css?: string[]
  loaderServerData?: any
  loaderData?: any
  loaderProps?: LoaderProps
}
