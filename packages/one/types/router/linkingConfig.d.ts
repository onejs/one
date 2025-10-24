import type { OneRouter } from '../interfaces/router';
import { type OneLinkingOptions } from './getLinkingConfig';
import type { RouteNode } from './Route';
export declare function getLinkingConfig(): OneLinkingOptions | undefined;
export declare function setLinkingConfig(_: OneLinkingOptions): void;
export declare function resetLinkingConfig(): void;
export declare function setupLinking(routeNode: RouteNode | null, initialLocation?: URL): OneRouter.ResultState | undefined;
//# sourceMappingURL=linkingConfig.d.ts.map