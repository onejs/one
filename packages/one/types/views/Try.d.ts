import React from 'react';
/** Props passed to a page's `ErrorBoundary` export. */
export type ErrorBoundaryProps = {
    /** Retry rendering the component by clearing the `error` state. */
    retry: () => Promise<void>;
    /** The error that was thrown. */
    error: Error;
};
export declare class Try extends React.Component<{
    catch: React.ComponentType<ErrorBoundaryProps>;
    children: React.ReactNode;
}, {
    error?: Error;
}> {
    state: {
        error: undefined;
    };
    static getDerivedStateFromError(error: Error): {
        error: Error;
    };
    retry: () => Promise<void>;
    render(): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | import("react/jsx-runtime").JSX.Element | null | undefined;
}
//# sourceMappingURL=Try.d.ts.map