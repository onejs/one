import { type LinkingOptions } from '@react-navigation/native';
import { type Screen } from '../getReactNavigationConfig.js';
import { getPathFromState } from '../link/linking.js';
import { type OneLinkingConfig } from '../link/getLinking.js';
import type { RouteNode } from './Route.js';
export declare function getNavigationConfig(routes: RouteNode, metaOnly?: boolean): {
    initialRouteName?: string;
    screens: Record<string, Screen>;
};
export type OneLinkingOptions = LinkingOptions<object> & {
    getPathFromState?: typeof getPathFromState;
};
export declare function getLinkingConfig(routes: RouteNode, metaOnly?: boolean, linking?: OneLinkingConfig): OneLinkingOptions;
export declare const stateCache: Map<string, any>;
export declare function clearStateCache(): void;
//# sourceMappingURL=getLinkingConfig.d.ts.map