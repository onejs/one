import type { ErrorBoundaryProps } from './Try';
/**
 * Default error boundary component for web.
 * Shows a user-friendly error message with retry capability.
 *
 * This component is used when:
 * - A route doesn't export its own ErrorBoundary
 * - An error occurs during rendering
 *
 * Users can override this by exporting their own ErrorBoundary from a route.
 */
export declare function ErrorBoundary({ error, retry, route }: ErrorBoundaryProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ErrorBoundary.web.d.ts.map