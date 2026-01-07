import { useActiveParams, useParams, usePathname } from "../hooks";
import type { OneRouter } from "../interfaces/router";
import type { LoaderProps } from "../types";

export function createRoute<Path extends string = string>() {
  type Route = OneRouter.RouteType<Path>;
  type Params = Route["Params"];
  type TypedLoaderProps = LoaderProps<Params>;

  return {
    useParams: () => useParams<Params>(),
    useActiveParams: () => useActiveParams<Params>(),
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
    createLoader: <T>(fn: (props: TypedLoaderProps) => T) => fn,
  };
}

const defaults = createRoute();

const getProxy = () =>
  new Proxy(
    {},
    {
      get(target, key) {
        if (Reflect.has(defaults, key)) {
          return Reflect.get(defaults, key);
        }

        return getProxy();
      },
    },
  );

const postIdRoute = createRoute<"/feed/[id]">();

export const route = getProxy() as {
  feed: {
    $id: typeof postIdRoute;
  };
  notifications: {};
  profile: {};
};
