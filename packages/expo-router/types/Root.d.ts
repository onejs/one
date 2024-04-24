import { type ExpoRootProps } from './ExpoRoot';
import type { GlobbedRouteImports } from './types';
type RootProps = Omit<ExpoRootProps, 'context'> & {
    routes: GlobbedRouteImports;
    path?: string;
    version?: number;
};
export declare function Root(props: RootProps): import("react/jsx-runtime").JSX.Element;
export {};
//# sourceMappingURL=Root.d.ts.map