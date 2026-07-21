import { type ReactNode } from 'react';
import type { NavigationRenderWebCallback } from './types';
export type NavigationRenderProps = {
    web?: NavigationRenderWebCallback;
    children?: ReactNode;
};
export declare function NavigationRender({ web, children }: NavigationRenderProps): string | number | bigint | boolean | Iterable<ReactNode> | Promise<string | number | bigint | boolean | import("react").ReactPortal | import("react").ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | import("react/jsx-runtime").JSX.Element | null | undefined;
export declare function useNavigationRenderWeb(): NavigationRenderWebCallback | undefined;
//# sourceMappingURL=NavigationRender.d.ts.map