import React from 'react';
/**
 * Route context information passed to error boundaries.
 * Provides details about where the error occurred.
 */
export type ErrorRouteInfo = {
    /** The current pathname (e.g., "/users/123") */
    pathname?: string;
    /** The route name/key (e.g., "users/[id]") */
    routeName?: string;
    /** Route parameters extracted from the path */
    params?: Record<string, string | string[]>;
    /** The error type classification */
    errorType?: 'render' | 'loader' | 'hydration';
    /** Component stack trace from React */
    componentStack?: string;
};
/** Props passed to a page's `ErrorBoundary` export. */
export type ErrorBoundaryProps = {
    /** Retry rendering the component by clearing the `error` state. */
    retry: () => Promise<void>;
    /** The error that was thrown. */
    error: Error;
    /** Route information about where the error occurred. */
    route?: ErrorRouteInfo;
};
type TryProps = {
    catch: React.ComponentType<ErrorBoundaryProps>;
    children: React.ReactNode;
    /** Optional route information to pass to the error boundary */
    routeInfo?: ErrorRouteInfo;
};
type TryState = {
    error?: Error;
    componentStack?: string;
};
export declare class Try extends React.Component<TryProps, TryState> {
    state: TryState;
    static getDerivedStateFromError(error: Error): {
        error: Error;
    };
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void;
    retry: () => Promise<void>;
    render(): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | import("react/jsx-runtime").JSX.Element | null | undefined;
}
export {};
//# sourceMappingURL=Try.d.ts.map