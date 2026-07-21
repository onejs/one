import type { ErrorInfo } from 'react';
export type RouteErrorViewProps = {
    routeName: string;
    error: unknown;
    errorInfo: ErrorInfo | null;
    onRetry: () => void;
};
export declare function RouteErrorView({ routeName, error, errorInfo, onRetry, }: RouteErrorViewProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=RouteErrorView.d.ts.map