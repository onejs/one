import React, { type ReactNode } from 'react';
import type { ErrorBoundaryProps } from '../views/Try';
import type { LoaderProps } from '../types';
import type { One } from '../vite/types';
import type { ParamValidator, RouteValidationFn } from '../validateParams';
export type DynamicConvention = {
    name: string;
    deep: boolean;
    notFound?: boolean;
};
export type LoadedRoute = {
    ErrorBoundary?: React.ComponentType<ErrorBoundaryProps>;
    default?: React.ComponentType<any>;
    unstable_settings?: Record<string, any>;
    getNavOptions?: (args: any) => any;
    generateStaticParams?: (props: {
        params?: Record<string, string | string[]>;
    }) => Record<string, string | string[]>[];
    loader?: (props: LoaderProps) => Record<string, string | string[]>[];
    /**
     * Validate route params before navigation.
     * Use with Zod, Valibot, or a custom function.
     *
     * @example
     * ```ts
     * import { z } from 'zod'
     * export const validateParams = z.object({
     *   id: z.string().uuid()
     * })
     * ```
     */
    validateParams?: ParamValidator;
    /**
     * Async route validation function.
     * Runs before navigation to validate the route is accessible.
     *
     * @example
     * ```ts
     * export async function validateRoute({ params }) {
     *   const exists = await checkResourceExists(params.id)
     *   if (!exists) {
     *     return { valid: false, error: 'Resource not found' }
     *   }
     *   return { valid: true }
     * }
     * ```
     */
    validateRoute?: RouteValidationFn;
};
export type RouteNode = {
    /** The type of RouteNode */
    type: One.RouteType;
    /** Load a route into memory. Returns the exports from a route. */
    loadRoute: () => Partial<LoadedRoute>;
    /** Loaded initial route name. */
    initialRouteName?: string;
    /** nested routes */
    children: RouteNode[];
    /** Is the route a dynamic path */
    dynamic: null | DynamicConvention[];
    /** `index`, `error-boundary`, etc. */
    route: string;
    /** Context Module ID, used for matching children. */
    contextKey: string;
    /** Added in-memory */
    generated?: boolean;
    /** Internal screens like the directory or the auto 404 should be marked as internal. */
    internal?: boolean;
    /** File paths for async entry modules that should be included in the initial chunk request to ensure the runtime JavaScript matches the statically rendered HTML representation. */
    entryPoints?: string[];
    /** Parent layouts */
    layouts?: RouteNode[];
    /** Parent middlewares */
    middlewares?: RouteNode[];
};
export declare const RouteParamsContext: React.Context<Record<string, string | undefined> | undefined>;
/** Return the RouteNode at the current contextual boundary. */
export declare function useRouteNode(): RouteNode | null;
export declare function useContextKey(): string;
/** Provides the matching routes and filename to the children. */
export declare function Route({ children, node, route, }: {
    children: ReactNode;
    node: RouteNode;
    route?: {
        params?: Record<string, string | undefined>;
    };
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=Route.d.ts.map