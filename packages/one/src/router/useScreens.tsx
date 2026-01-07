import { createNavigatorFactory } from "@react-navigation/core";
import { SafeAreaProviderCompat } from "@react-navigation/elements";
import type {
  EventMapBase,
  NavigationState,
  ParamListBase,
  RouteProp,
  ScreenListeners,
} from "@react-navigation/native";
import React, { memo, Suspense, useId } from "react";
import { SafeAreaView, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { ServerContextScript } from "../server/ServerContextScript";
import { getPageExport } from "../utils/getPageExport";
import { EmptyRoute } from "../views/EmptyRoute";
import { Try } from "../views/Try";
import { DevHead } from "../vite/DevHead";
import { useServerContext } from "../vite/one-server-only";
import { filterRootHTML } from "./filterRootHTML";
import {
  type DynamicConvention,
  type LoadedRoute,
  Route,
  type RouteNode,
  useRouteNode,
} from "./Route";
import { sortRoutesWithInitial } from "./sortRoutes";

// `@react-navigation/core` does not expose the Screen or Group components directly, so we have to
// do this hack.
export const { Screen, Group } = createNavigatorFactory({} as any)();

// Cache inline CSS elements at module load (before React hydrates).
// Reads CSS content from SSR'd <style> elements and creates matching JSX
// so hydration sees identical content without 100KB+ JSON payload.
const cachedInlineCSSElements: React.ReactNode[] =
  typeof document !== "undefined"
    ? Array.from(document.querySelectorAll<HTMLStyleElement>('style[id^="__one_css_"]')).map(
        (el, i) => (
          <style
            key={`inline-css-${i}`}
            id={el.id}
            dangerouslySetInnerHTML={{ __html: el.innerHTML }}
          />
        ),
      )
    : [];

export type ScreenProps<
  TOptions extends Record<string, any> = Record<string, any>,
  State extends NavigationState = NavigationState,
  EventMap extends EventMapBase = EventMapBase,
> = {
  /** Name is required when used inside a Layout component. */
  name?: string;
  /**
   * Redirect to the nearest sibling route.
   * If all children are redirect={true}, the layout will render `null` as there are no children to render.
   */
  redirect?: boolean;
  initialParams?: Record<string, any>;
  options?: TOptions;

  listeners?:
    | ScreenListeners<State, EventMap>
    | ((prop: {
        route: RouteProp<ParamListBase, string>;
        navigation: any;
      }) => ScreenListeners<State, EventMap>);

  getId?: ({ params }: { params?: Record<string, any> }) => string | undefined;
};

function getSortedChildren(
  children: RouteNode[],
  order?: ScreenProps[],
  initialRouteName?: string,
  options?: { onlyMatching?: boolean },
): { route: RouteNode; props: Partial<ScreenProps> }[] {
  if (!order?.length) {
    return children
      .sort(sortRoutesWithInitial(initialRouteName))
      .map((route) => ({ route, props: {} }));
  }

  const entries = [...children];

  const ordered = order
    .map(({ name, redirect, initialParams, listeners, options, getId }) => {
      if (!entries.length) {
        console.warn(`[Layout children]: Too many screens defined. Route "${name}" is extraneous.`);
        return null;
      }
      const matchIndex = entries.findIndex((child) => child.route === name);
      if (matchIndex === -1) {
        console.warn(
          `[Layout children]: No route named "${name}" exists in nested children:`,
          children.map(({ route }) => route),
        );
        return null;
      }
      // Get match and remove from entries
      const match = entries[matchIndex];
      entries.splice(matchIndex, 1);

      // Ensure to return null after removing from entries.
      if (redirect) {
        if (typeof redirect === "string") {
          throw new Error(`Redirecting to a specific route is not supported yet.`);
        }
        return null;
      }

      return {
        route: match,
        props: { initialParams, listeners, options, getId },
      };
    })
    .filter(Boolean) as {
    route: RouteNode;
    props: Partial<ScreenProps>;
  }[];

  // Add any remaining children
  if (!options?.onlyMatching) {
    ordered.push(
      ...entries
        .sort(sortRoutesWithInitial(initialRouteName))
        .map((route) => ({ route, props: {} })),
    );
  }

  return ordered;
}

/**
 * @returns React Navigation screens sorted by the `route` property.
 */
export function useSortedScreens(
  order: ScreenProps[],
  options?: { onlyMatching?: boolean },
): React.ReactNode[] {
  const node = useRouteNode();

  const sortedScreens = React.useMemo(() => {
    const sorted = node?.children?.length
      ? getSortedChildren(node.children, order, node.initialRouteName, options)
      : [];

    return sorted.map((value) => routeToScreen(value.route, value.props));
  }, [node?.children, node?.initialRouteName, order]);

  return sortedScreens;
}

function fromImport({ ErrorBoundary, ...component }: LoadedRoute) {
  if (ErrorBoundary) {
    return {
      default: React.forwardRef((props: any, ref: any) => {
        const children = React.createElement(getPageExport(component) || EmptyRoute, {
          ...props,
          ref,
        });
        return <Try catch={ErrorBoundary}>{children}</Try>;
      }),
    };
  }
  if (process.env.NODE_ENV !== "production") {
    const exported = getPageExport(component);
    if (exported && typeof exported === "object" && Object.keys(exported).length === 0) {
      return { default: EmptyRoute };
    }
  }

  return { default: getPageExport(component) };
}

// TODO: Maybe there's a more React-y way to do this?
// Without this store, the process enters a recursive loop.
const qualifiedStore = new WeakMap<RouteNode, React.ComponentType<any>>();

/** Wrap the component with various enhancements and add access to child routes. */
export function getQualifiedRouteComponent(value: RouteNode) {
  if (value && qualifiedStore.has(value)) {
    return qualifiedStore.get(value)!;
  }

  const ScreenComponent = React.forwardRef((props: any, ref) => {
    const res = value.loadRoute();
    const Component = getPageExport(fromImport(res)) as React.ComponentType<any>;

    if (process.env.NODE_ENV === "development" && process.env.DEBUG === "one") {
      console.groupCollapsed(`Render ${props.key} ${props.segment}`);
      console.info(`value`, value);
      console.info(`Component`, Component);
      console.groupEnd();
    }

    // this is causing HMR to not work on root layout
    if (props.segment === "") {
      // @ts-expect-error
      const out = Component(props, ref);

      const { children, bodyProps, head, htmlProps } = filterRootHTML(out);
      const { children: headChildren, ...headProps } = (head?.props || {}) as Record<string, any>;
      const serverContext = useServerContext();

      // let finalChildren = <Suspense fallback={null}>{children}</Suspense>
      let finalChildren = children;

      if (process.env.TAMAGUI_TARGET === "native") {
        // on native we just ignore all html/body/head
        return finalChildren;
      }

      finalChildren = (
        <>
          <head key="head" {...headProps}>
            <DevHead />
            <script
              dangerouslySetInnerHTML={{
                __html: `globalThis['global'] = globalThis`,
              }}
            />
            {serverContext?.cssContents?.length || serverContext?.cssInlineCount
              ? // Inline CSS: SSR renders fresh, client uses cached elements from module load
                serverContext?.cssContents
                ? serverContext.cssContents.map((content, i) => (
                    <style
                      key={`inline-css-${i}`}
                      id={`__one_css_${i}`}
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  ))
                : cachedInlineCSSElements
              : serverContext?.css?.map((file) => <link key={file} rel="stylesheet" href={file} />)}
            <ServerContextScript />
            {headChildren}
          </head>
          <body key="body" suppressHydrationWarning {...bodyProps}>
            <SafeAreaProviderCompat>{finalChildren}</SafeAreaProviderCompat>
          </body>
        </>
      );

      return (
        // tamagui and libraries can add className on hydration to have ssr safe styling
        // so supress hydration warnings here
        <html suppressHydrationWarning lang="en-US" {...htmlProps}>
          {finalChildren}
        </html>
      );
    }

    return (
      <RouteErrorBoundary routeName={value.route}>
        <Component {...props} ref={ref} />
      </RouteErrorBoundary>
    );
  });

  const wrapSuspense = (children: any) => {
    // so as far as i understand, adding suspense causes flickers on web during nav because
    // we can't seem to get react navigation to properly respect startTransition(() => {})
    // i tried a lot of things, but didn't find the root cause, but native needs suspense or
    // else it hits an error about no suspense boundary being set

    if (process.env.TAMAGUI_TARGET === "native" || process.env.ONE_SUSPEND_ROUTES === "1") {
      return <Suspense fallback={null}>{children}</Suspense>;
    }
    return children;
  };

  const QualifiedRoute = React.forwardRef(
    (
      {
        // Remove these React Navigation props to
        // enforce usage of router hooks (where the query params are correct).
        route,
        navigation,

        // Pass all other props to the component
        ...props
      }: any,
      ref: any,
    ) => {
      return (
        <Route route={route} node={value}>
          <>
            {wrapSuspense(
              <ScreenComponent
                {...{
                  ...props,
                  ref,
                  // Expose the template segment path, e.g. `(home)`, `[foo]`, `index`
                  // the intention is to make it possible to deduce shared routes.
                  segment: value.route,
                }}
              />,
            )}
          </>
        </Route>
      );
    },
  );

  QualifiedRoute.displayName = `Route(${value.route})`;

  qualifiedStore.set(value, QualifiedRoute);
  return memo(QualifiedRoute);
}

/** @returns a function which provides a screen id that matches the dynamic route name in params. */
export function createGetIdForRoute(
  route: Pick<RouteNode, "dynamic" | "route" | "contextKey" | "children">,
) {
  const include = new Map<string, DynamicConvention>();

  if (route.dynamic) {
    for (const segment of route.dynamic) {
      include.set(segment.name, segment);
    }
  }

  return ({ params = {} } = {} as { params?: Record<string, any> }) => {
    const segments: string[] = [];

    for (const dynamic of include.values()) {
      const value = params?.[dynamic.name];
      if (Array.isArray(value) && value.length > 0) {
        // If we are an array with a value
        segments.push(value.join("/"));
      } else if (value && !Array.isArray(value)) {
        // If we have a value and not an empty array
        segments.push(value);
      } else if (dynamic.deep) {
        segments.push(`[...${dynamic.name}]`);
      } else {
        segments.push(`[${dynamic.name}]`);
      }
    }

    return segments.join("/") ?? route.contextKey;
  };
}

function routeToScreen(route: RouteNode, { options, ...props }: Partial<ScreenProps> = {}) {
  return (
    <Screen
      // Users can override the screen getId function.
      getId={createGetIdForRoute(route)}
      {...props}
      name={route.route}
      key={route.route}
      options={(args) => {
        // Only eager load generated components
        const staticOptions = route.generated ? route.loadRoute()?.getNavOptions : null;
        const staticResult =
          typeof staticOptions === "function" ? staticOptions(args) : staticOptions;
        const dynamicResult = typeof options === "function" ? options?.(args) : options;
        const output = {
          ...staticResult,
          ...dynamicResult,
        };

        // Prevent generated screens from showing up in the tab bar.
        if (route.generated) {
          output.tabBarButton = () => null;
          // TODO: React Navigation doesn't provide a way to prevent rendering the drawer item.
          output.drawerItemStyle = { height: 0, display: "none" };
        }

        return output;
      }}
      // this doesn't work, also probably better to wrap suspense only on root layout in useScreens
      // but it doesnt seem to pick up our startTransitions which i wrapped in a few places.
      // now i thought this was due to our use of useSyncExternalStore, but i replaced that with
      // `use-sync-external-store/shim` and i also replaced the one in react-navigation that does
      // `use-sync-external-store/with-selector` to `use-sync-external-store/shim/with-selector`
      // but still it seems something else must be updating state outside a transition.

      // layout={({ children }) => {
      //   console.log('route.contextKey', route.contextKey)
      //   if (route.contextKey === '') {
      //     return <Suspense fallback={null}>{children}</Suspense>
      //   }
      //   return children
      // }}
      getComponent={() => {
        // log here to see which route is rendered
        // console.log('getting', route, getQualifiedRouteComponent(route))
        return getQualifiedRouteComponent(route);
      }}
    />
  );
}

type RouteErrorBoundaryState = { hasError: boolean; error: any; errorInfo: any };

const ROUTE_ERROR_BOUNDARY_INITIAL_STATE = {
  hasError: false,
  error: null,
  errorInfo: null,
};

class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode; routeName: string },
  RouteErrorBoundaryState
> {
  constructor(props) {
    super(props);
    this.state = ROUTE_ERROR_BOUNDARY_INITIAL_STATE;
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(
      `Error occurred while running route "${this.props.routeName}": ${
        error instanceof Error ? error.message : error
      }\n\n${error.stack}\n\nComponent Stack:\n${errorInfo.componentStack}`,
    );
    this.setState({ errorInfo });
  }

  clearError() {
    this.setState(ROUTE_ERROR_BOUNDARY_INITIAL_STATE);
  }

  render() {
    if (this.state.hasError) {
      const { error, errorInfo } = this.state;
      return (
        <SafeAreaView style={{ backgroundColor: "#000" }}>
          <View style={{ margin: 16, gap: 16 }}>
            <Text
              style={{
                alignSelf: "flex-start",
                padding: 5,
                margin: -5,
                backgroundColor: "red",
                color: "white",
                fontSize: 20,
                fontFamily: "monospace",
              }}
            >
              Error on route "{this.props.routeName}"
            </Text>
            <Text style={{ color: "white", fontSize: 16, fontFamily: "monospace" }}>
              {error instanceof Error ? error.message : error}
            </Text>
            <TouchableOpacity onPress={this.clearError.bind(this)}>
              <Text
                style={{
                  alignSelf: "flex-start",
                  margin: -6,
                  padding: 6,
                  backgroundColor: "white",
                  color: "black",
                  fontSize: 14,
                  fontFamily: "monospace",
                }}
              >
                Retry
              </Text>
            </TouchableOpacity>
            <ScrollView contentContainerStyle={{ gap: 12 }}>
              {error instanceof Error ? (
                <Text style={{ color: "white", fontSize: 12, fontFamily: "monospace" }}>
                  {error.stack}
                </Text>
              ) : null}
              {errorInfo?.componentStack ? (
                <Text style={{ color: "white", fontSize: 12, fontFamily: "monospace" }}>
                  Component Stack: {errorInfo.componentStack}
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </SafeAreaView>
      );
    }

    return this.props.children;
  }
}
