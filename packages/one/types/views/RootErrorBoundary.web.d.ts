import React from 'react';
type RootErrorBoundaryState = {
    hasError: boolean;
    error: Error | null;
    componentStack: string | null;
};
export declare class RootErrorBoundary extends React.Component<{
    children: React.ReactNode;
}, RootErrorBoundaryState> {
    state: RootErrorBoundaryState;
    static getDerivedStateFromError(error: Error): {
        hasError: boolean;
        error: Error;
    };
    componentDidCatch(error: Error, info: React.ErrorInfo): void;
    handleRetry: () => void;
    render(): string | number | bigint | boolean | import("react/jsx-runtime").JSX.Element | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | Iterable<React.ReactNode> | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | React.ReactPortal | null | undefined> | null | undefined;
}
export {};
//# sourceMappingURL=RootErrorBoundary.web.d.ts.map