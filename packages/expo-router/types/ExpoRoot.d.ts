import { type FunctionComponent, type ReactNode } from 'react';
import type { RequireContext } from './types';
export type ExpoRootProps = {
    context: RequireContext;
    location?: URL;
    wrapper?: FunctionComponent<{
        children: ReactNode;
    }>;
};
export declare function ExpoRoot({ wrapper: ParentWrapper, ...props }: ExpoRootProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=ExpoRoot.d.ts.map