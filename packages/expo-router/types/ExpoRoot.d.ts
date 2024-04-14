import { type FunctionComponent, type ReactNode } from 'react';
import type { RequireContext } from './types';
import type { NavigationContainerProps } from '@react-navigation/core';
export type ExpoRootProps = {
    context: RequireContext;
    location?: URL;
    wrapper?: FunctionComponent<{
        children: ReactNode;
    }>;
    navigationContainerProps?: NavigationContainerProps;
};
export declare function ExpoRoot({ wrapper: ParentWrapper, navigationContainerProps, ...props }: ExpoRootProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ExpoRoot.d.ts.map