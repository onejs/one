import { type FunctionComponent, type ReactNode } from 'react';
import type { NavigationContainerProps } from '@react-navigation/native';
import type { RequireContext } from './types';
export type ExpoRootProps = {
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
export declare function ExpoRoot({ wrapper: ParentWrapper, navigationContainerProps, ...props }: ExpoRootProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ExpoRoot.d.ts.map