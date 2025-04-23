import type React from 'react';
import type { UrlObject } from './getNormalizedStatePath';
export type FocusedRouteState = {
    routes: [
        {
            key?: string;
            name: string;
            params?: object;
            path?: string;
            state?: FocusedRouteState;
        }
    ];
};
export declare const GlobalStateForPathContext: React.Context<FocusedRouteState | undefined>;
export declare const GlobalRouteInfoContext: React.Context<UrlObject | undefined>;
export declare function GlobalStateContextProvider({ children }: {
    children: React.ReactNode;
}): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=GlobalStateContext.d.ts.map