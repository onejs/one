/**
 * SSR-optimized replacement for BaseNavigationContainer.
 * Provides only the 5 contexts that child navigators need during SSR render,
 * with static/no-op values. Eliminates 32+ hooks and reduces 8 providers to 5.
 *
 * Requires @react-navigation/core package.json exports to include internal context paths.
 * See postinstall patch in the repo.
 */
import * as React from 'react';
export declare function SSRNavigationContainer({ initialState, theme, linking, children, }: {
    initialState: any;
    theme: any;
    linking?: any;
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=SSRNavigationContainer.d.ts.map