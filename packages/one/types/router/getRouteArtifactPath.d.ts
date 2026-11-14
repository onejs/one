import type { OneLinkingOptions } from './getLinkingConfig.js';
import type { RouteNode } from './Route.js';
type Linking = Pick<OneLinkingOptions, 'config' | 'getStateFromPath'>;
export declare function getRouteArtifactPaths(href: string, linking: Linking | undefined, rootNode: RouteNode | null): {
    loader: string;
    preload: string;
};
export {};
//# sourceMappingURL=getRouteArtifactPath.d.ts.map