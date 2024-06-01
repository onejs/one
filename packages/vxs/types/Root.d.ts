import { type FunctionComponent, type ReactNode } from 'react';
import type { GlobbedRouteImports, RenderAppProps } from './types';
import type { NavigationContainerProps } from '@react-navigation/native';
import type { RequireContext } from './types';
type RootProps = RenderAppProps & Omit<InnerProps, 'context'> & {
    isClient?: boolean;
    routes: GlobbedRouteImports;
};
type InnerProps = {
    context: RequireContext;
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
export declare function Root(props: RootProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Root.d.ts.map