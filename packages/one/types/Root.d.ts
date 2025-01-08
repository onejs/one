import { type NavigationContainerProps } from '@react-navigation/native';
import { type FunctionComponent, type ReactNode } from 'react';
import type { GlobbedRouteImports } from './types';
import type { One } from './vite/types';
type RootProps = Omit<InnerProps, 'context'> & {
    path: string;
    isClient?: boolean;
    routes: GlobbedRouteImports;
    routeOptions?: One.RouteOptions;
};
type InnerProps = {
    context: One.RouteContext;
    location?: URL;
    wrapper?: FunctionComponent<{
        children: ReactNode;
    }>;
    navigationContainerProps?: NavigationContainerProps & {
        theme?: {
            dark: boolean;
            colors: {
                primary: string;
                background: string;
                card: string;
                text: string;
                border: string;
                notification: string;
            };
        };
    };
};
export declare function Root(props: RootProps): import("react/jsx-runtime").JSX.Element | null;
export {};
//# sourceMappingURL=Root.d.ts.map