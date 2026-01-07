import type { OneRouter } from '../interfaces/router'
import type { LoaderProps } from '../types'
export declare function createRoute<Path extends string = string>(): {
  useParams: () => Partial<OneRouter.RouteType<Path>['Params']>
  useActiveParams: () => Partial<OneRouter.RouteType<Path>['Params']>
  /**
   * Creates a typed loader function for this route.
   * The loader receives LoaderProps with typed params.
   *
   * @example
   * const route = createRoute<'(site)/docs/[slug]'>()
   * export const loader = route.createLoader(({ params }) => {
   *   // params is typed as { slug: string }
   *   return { doc: getDoc(params.slug) }
   * })
   */
  createLoader: <T>(
    fn: (props: LoaderProps<OneRouter.RouteType<Path>['Params']>) => T
  ) => (props: LoaderProps<OneRouter.RouteType<Path>['Params']>) => T
}
declare const postIdRoute: {
  useParams: () => Partial<OneRouter.InputRouteParams<'/feed/[id]'>>
  useActiveParams: () => Partial<OneRouter.InputRouteParams<'/feed/[id]'>>
  /**
   * Creates a typed loader function for this route.
   * The loader receives LoaderProps with typed params.
   *
   * @example
   * const route = createRoute<'(site)/docs/[slug]'>()
   * export const loader = route.createLoader(({ params }) => {
   *   // params is typed as { slug: string }
   *   return { doc: getDoc(params.slug) }
   * })
   */
  createLoader: <T>(
    fn: (props: LoaderProps<OneRouter.InputRouteParams<'/feed/[id]'>>) => T
  ) => (props: LoaderProps<OneRouter.InputRouteParams<'/feed/[id]'>>) => T
}
export declare const route: {
  feed: {
    $id: typeof postIdRoute
  }
  notifications: {}
  profile: {}
}
export {}
//# sourceMappingURL=createRoute.d.ts.map
