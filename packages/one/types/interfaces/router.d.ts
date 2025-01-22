import type { NavigationContainerRefWithCurrent, NavigationState, PartialState } from '@react-navigation/core';
import type { ReactNode } from 'react';
import type { TextProps, GestureResponderEvent, PressableProps } from 'react-native';
export declare namespace OneRouter {
    export interface __routes<T extends string = string> extends Record<string, unknown> {
    }
    export type Route<Path> = {
        Params: InputRouteParams<Path>;
        Props: {
            params: InputRouteParams<Path>;
        };
        Loader: (props: {
            params: InputRouteParams<Path>;
        }) => any;
    };
    type StaticRoutes = __routes extends {
        StaticRoutes: string;
    } ? __routes['StaticRoutes'] : string;
    type DynamicRoutes<T extends string> = __routes<T> extends {
        DynamicRoutes: any;
    } ? T extends __routes<infer _>['DynamicRoutes'] ? T : never : string;
    export type DynamicRouteTemplate = __routes extends {
        DynamicRouteTemplate: string;
    } ? __routes['DynamicRouteTemplate'] : string;
    export type NavigationRef = NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>;
    export type RelativePathString = `./${string}` | `../${string}` | '..';
    export type AbsoluteRoute = DynamicRouteTemplate | StaticRoutes;
    export type ExternalPathString = `${string}:${string}`;
    export type OneRouterRoutes = DynamicRouteTemplate | StaticRoutes | RelativePathString;
    export type AllRoutes = OneRouterRoutes | ExternalPathString;
    export type LinkToOptions = {
        scroll?: boolean;
    };
    type SearchOrHash = `?${string}` | `#${string}`;
    export type UnknownInputParams = Record<string, string | number | undefined | null | (string | number)[]>;
    type UnknownOutputParams = Record<string, string | string[]>;
    /**
     * Return only the RoutePart of a string. If the string has multiple parts return never
     *
     * string   | type
     * ---------|------
     * 123      | 123
     * /123/abc | never
     * 123?abc  | never
     * ./123    | never
     * /123     | never
     * 123/../  | never
     */
    export type SingleRoutePart<S extends string> = S extends `${string}/${string}` ? never : S extends `${string}${SearchOrHash}` ? never : S extends '' ? never : S extends `(${string})` ? never : S extends `[${string}]` ? never : S;
    /**
     * Return only the CatchAll router part. If the string has search parameters or a hash return never
     */
    export type CatchAllRoutePart<S extends string> = S extends `${string}${SearchOrHash}` ? never : S extends '' ? never : S extends `${string}(${string})${string}` ? never : S extends `${string}[${string}]${string}` ? never : S;
    /**
     * Return the name of a route parameter
     * '[test]'    -> 'test'
     * 'test'      -> never
     * '[...test]' -> '...test'
     */
    type IsParameter<Part> = Part extends `[${infer ParamName}]` ? ParamName : never;
    /**
     * Return a union of all raw parameter names. If there are no names return never
     *
     * This differs from ParameterNames as it returns the `...` for catch all parameters
     *
     * /[test]         -> 'test'
     * /[abc]/[...def] -> 'abc'|'...def'
     */
    type ParameterNames<Path> = Path extends `${infer PartA}/${infer PartB}` ? IsParameter<PartA> | ParameterNames<PartB> : IsParameter<Path>;
    /**
     * Returns all segments of a route.
     *
     * /(group)/123/abc/[id]/[...rest] -> ['(group)', '123', 'abc', '[id]', '[...rest]'
     */
    type RouteSegments<Path> = Path extends `${infer PartA}/${infer PartB}` ? PartA extends '' | '.' ? [...RouteSegments<PartB>] : [PartA, ...RouteSegments<PartB>] : Path extends '' ? [] : [Path];
    type AllUngroupedRoutes<Path> = Path extends `(${infer PartA})/${infer PartB}` ? `(${PartA})/${AllUngroupedRoutes<PartB>}` | AllUngroupedRoutes<PartB> : Path;
    /**
     * Returns a Record of the routes parameters as strings and CatchAll parameters
     *
     * There are two versions, input and output, as you can input 'string | number' but
     *  the output will always be 'string'
     *
     * /[id]/[...rest] -> { id: string, rest: string[] }
     * /no-params      -> {}
     */
    export type InputRouteParams<Path> = {
        [Key in ParameterNames<Path> as Key extends `...${infer Name}` ? Name : Key]: Key extends `...${string}` ? string[] : string;
    };
    type OutputRouteParams<Path> = {
        [Key in ParameterNames<Path> as Key extends `...${infer Name}` ? Name : Key]: Key extends `...${string}` ? string[] : string;
    } & UnknownOutputParams;
    /**
     * Returns the search parameters for a route.
     */
    export type SearchParams<T extends AllRoutes = never> = T extends DynamicRouteTemplate ? OutputRouteParams<T> : T extends StaticRoutes ? never : UnknownOutputParams;
    /*********
     * Href  *
     *********/
    export type DynamicRoutesHref = DynamicRouteString<{
        __branded__: any;
    }, DynamicRouteTemplate>;
    export type DynamicRoutesHref2 = DynamicRouteString<string, DynamicRouteTemplate>;
    /**
     * The main routing type for One. Includes all available routes with strongly typed parameters.
     */
    export type Href<T extends string | object = {
        __branded__: any;
    }> = StringRouteToType<AllUngroupedRoutes<StaticRoutes> | RelativePathString | ExternalPathString> | DynamicRouteString<T, DynamicRouteTemplate> | DynamicRouteObject<StaticRoutes | RelativePathString | ExternalPathString | DynamicRouteTemplate>;
    type StringRouteToType<T extends string> = T | `${T}${SearchOrHash}` | {
        pathname: T;
        params?: UnknownInputParams | never;
    };
    /**
     * Converts a dynamic route template to a Href string type
     */
    type DynamicRouteString<T extends string | object, P = DynamicRouteTemplate> = '__branded__' extends keyof T ? DynamicTemplateToHrefString<P> : T extends string ? DynamicRoutes<T> : never;
    type DynamicTemplateToHrefString<Path> = Path extends `${infer PartA}/${infer PartB}` ? `${PartA extends `[${string}]` ? string : PartA}/${DynamicTemplateToHrefString<PartB>}` : Path extends `[${string}]` ? string : Path;
    type DynamicRouteObject<T> = T extends DynamicRouteTemplate ? {
        pathname: T;
        params: InputRouteParams<T>;
    } : never;
    export type LoadingState = 'loading' | 'loaded';
    export type ResultState = PartialState<NavigationState> & {
        state?: ResultState;
        hash?: string;
        linkOptions?: OneRouter.LinkToOptions;
    };
    export type RootStateListener = (state: ResultState) => void;
    export type LoadingStateListener = (state: LoadingState) => void;
    /***********************
     * One Exports *
     ***********************/
    export type InputRouteParamsBlank = Record<string, string | undefined | null>;
    export type InpurRouteParamsGeneric = InputRouteParamsBlank | InputRouteParams<any>;
    export type Router = {
        /** Go back in the history. */
        back: () => void;
        /** If there's history that supports invoking the `back` function. */
        canGoBack: () => boolean;
        /** Navigate to the provided href using a push operation if possible. */
        push: (href: Href, options?: LinkToOptions) => void;
        /** Navigate to the provided href. */
        navigate: (href: Href, options?: LinkToOptions) => void;
        /** Navigate to route without appending to the history. */
        replace: (href: Href, options?: LinkToOptions) => void;
        /** Navigate to the provided href using a push operation if possible. */
        dismiss: (count?: number) => void;
        /** Navigate to first screen within the lowest stack. */
        dismissAll: () => void;
        /** If there's history that supports invoking the `dismiss` and `dismissAll` function. */
        canDismiss: () => boolean;
        /** Update the current route query params. */
        setParams: <T = ''>(params?: T extends '' ? InputRouteParamsBlank : InputRouteParams<T>) => void;
        /** Subscribe to state updates from the router */
        subscribe: (listener: RootStateListener) => () => void;
        /** Subscribe to loading state updates */
        onLoadState: (listener: LoadingStateListener) => () => void;
    };
    /** The imperative router. */
    export const router: Router;
    /************
     * <Link /> *
     ************/
    export interface WebAnchorProps {
        /**
         * **Web only:** Specifies where to open the `href`.
         *
         * - **_self**: the current tab.
         * - **_blank**: opens in a new tab or window.
         * - **_parent**: opens in the parent browsing context. If no parent, defaults to **_self**.
         * - **_top**: opens in the highest browsing context ancestor. If no ancestors, defaults to **_self**.
         *
         * This property is passed to the underlying anchor (`<a>`) tag.
         *
         * @default '_self'
         *
         * @example
         * <Link href="https://expo.dev" target="_blank">Go to Expo in new tab</Link>
         */
        target?: '_self' | '_blank' | '_parent' | '_top' | (string & object);
        /**
         * **Web only:** Specifies the relationship between the `href` and the current route.
         *
         * Common values:
         * - **nofollow**: Indicates to search engines that they should not follow the `href`. This is often used for user-generated content or links that should not influence search engine rankings.
         * - **noopener**: Suggests that the `href` should not have access to the opening window's `window.opener` object, which is a security measure to prevent potentially harmful behavior in cases of links that open new tabs or windows.
         * - **noreferrer**: Requests that the browser not send the `Referer` HTTP header when navigating to the `href`. This can enhance user privacy.
         *
         * The `rel` property is primarily used for informational and instructive purposes, helping browsers and web
         * crawlers make better decisions about how to handle and interpret the links on a web page. It is important
         * to use appropriate `rel` values to ensure that links behave as intended and adhere to best practices for web
         * development and SEO (Search Engine Optimization).
         *
         * This property is passed to the underlying anchor (`<a>`) tag.
         *
         * @example
         * <Link href="https://expo.dev" rel="nofollow">Go to Expo</Link>
         */
        rel?: string;
        /**
         * **Web only:** Specifies that the `href` should be downloaded when the user clicks on the link,
         * instead of navigating to it. It is typically used for links that point to files that the user should download,
         * such as PDFs, images, documents, etc.
         *
         * The value of the `download` property, which represents the filename for the downloaded file.
         * This property is passed to the underlying anchor (`<a>`) tag.
         *
         * @example
         * <Link href="/image.jpg" download="my-image.jpg">Download image</Link>
         */
        download?: string;
    }
    export interface LinkProps<T extends string | object> extends Omit<TextProps, 'href' | 'disabled' | 'onLongPress' | 'onPressIn' | 'onPressOut'>, Pick<PressableProps, 'disabled' | 'onLongPress' | 'onPressIn' | 'onPressOut'>, WebAnchorProps {
        /** Path to route to. */
        href: Href<T>;
        /** Forward props to child component. Useful for custom buttons. */
        asChild?: boolean;
        /** Should replace the current route without adding to the history. */
        replace?: boolean;
        /** Should push the current route  */
        push?: boolean;
        /** On web, this sets the HTML `class` directly. On native, this can be used with CSS interop tools like Nativewind. */
        className?: string;
        onPress?: (e: React.MouseEvent<HTMLAnchorElement, MouseEvent> | GestureResponderEvent) => void;
    }
    export interface LinkComponent {
        <T extends string | object>(props: React.PropsWithChildren<LinkProps<T>>): JSX.Element;
        /** Helper method to resolve an Href object into a string. */
        resolveHref: (href: Href) => string;
    }
    /**
     * Component to render link to another route using a path.
     * Uses an anchor tag on the web.
     *
     * @param props.href Absolute path to route (e.g. \`/feeds/hot\`).
     * @param props.replace Should replace the current route without adding to the history.
     * @param props.asChild Forward props to child component. Useful for custom buttons.
     * @param props.children Child elements to render the content.
     * @param props.className On web, this sets the HTML \`class\` directly. On native, this can be used with CSS interop tools like Nativewind.
     */
    export const Link: LinkComponent;
    /** Redirects to the href as soon as the component is mounted. */
    export const Redirect: (props: React.PropsWithChildren<{
        href: Href;
    }>) => ReactNode;
    export type Redirect = typeof Redirect;
    /**
     * Hooks
     */
    export function useRouter(): Router;
    /**
     * Returns the URL search parameters for the contextually focused route. e.g. \`/acme?foo=bar\` -> \`{ foo: "bar" }\`.
     * This is useful for stacks where you may push a new screen that changes the query parameters.
     *
     * To observe updates even when the invoking route is not focused, use \`useActiveParams()\`.
     * @see \`useActiveParams\`
     */
    export function useParams<TParams extends AllRoutes | UnknownOutputParams = UnknownOutputParams>(): TParams extends AllRoutes ? SearchParams<TParams> : TParams;
    /**
     * Get the globally selected query parameters, including dynamic path segments. This function will update even when the route is not focused.
     * Useful for analytics or other background operations that don't draw to the screen.
     *
     * When querying search params in a stack, opt-towards using \`useParams\` as these will only
     * update when the route is focused.
     *
     * @see \`useParams\`
     */
    export function useActiveParams<T extends AllRoutes | UnknownOutputParams = UnknownOutputParams>(): T extends AllRoutes ? SearchParams<T> : T;
    /**
     * Get a list of selected file segments for the currently selected route. Segments are not normalized, so they will be the same as the file path. e.g. /[id]?id=normal -> ["[id]"]
     *
     * \`useSegments\` can be typed using an abstract.
     * Consider the following file structure, and strictly typed \`useSegments\` function:
     *
     * \`\`\`md
     * - app
     *   - [user]
     *     - index.js
     *     - followers.js
     *   - settings.js
     * \`\`\`
     * This can be strictly typed using the following abstract:
     *
     * \`\`\`ts
     * const [first, second] = useSegments<['settings'] | ['[user]'] | ['[user]', 'followers']>()
     * \`\`\`
     */
    export function useSegments<T extends AbsoluteRoute | RouteSegments<AbsoluteRoute> | RelativePathString>(): T extends AbsoluteRoute ? RouteSegments<T> : T extends string ? string[] : T;
    export {};
}
export declare namespace One {
    type Route<Path> = OneRouter.Route<Path>;
}
//# sourceMappingURL=router.d.ts.map