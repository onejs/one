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
    render(): string | number | bigint | boolean | Iterable<React.ReactNode> | Promise<string | number | bigint | boolean | React.ReactPortal | React.ReactElement<unknown, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | null | undefined> | import("react/jsx-runtime").JSX.Element | null | undefined;
}
export {};
//# sourceMappingURL=RootErrorBoundary.d.ts.map