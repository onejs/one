import React from 'react';
import type { ErrorBoundaryProps } from './Try';
/**
 * Default error boundary component for native platforms.
 * Shows a user-friendly error message with retry capability.
 *
 * This component is used when:
 * - A route doesn't export its own ErrorBoundary
 * - An error occurs during rendering
 *
 * Users can override this by exporting their own ErrorBoundary from a route.
 */
export declare function ErrorBoundary({ error, retry, route }: ErrorBoundaryProps): React.JSX.Element;
//# sourceMappingURL=ErrorBoundary.d.ts.map