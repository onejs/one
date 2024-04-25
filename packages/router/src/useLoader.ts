export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  return globalThis['__vxrnLoaderData__']
}

export type LoaderProps<Params extends Object = Record<string, any>> = {
  path: string
  params: Params
}
