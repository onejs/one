import type { OneRouter } from '../interfaces/router'
import { type OneLinkingOptions } from './getLinkingConfig'
import type { RouteNode } from './Route'
export declare function getLinking(): OneLinkingOptions | undefined
export declare function setLinking(_: OneLinkingOptions): void
export declare function resetLinking(): void
export declare function setupLinking(
  routeNode: RouteNode | null,
  initialLocation?: URL
): OneRouter.ResultState | undefined
//# sourceMappingURL=linkingConfig.d.ts.map
