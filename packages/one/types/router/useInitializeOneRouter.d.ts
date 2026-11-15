import type { One } from '../vite/types.js';
import type { OneLinkingConfig } from '../link/getLinking.js';
import * as routerStore from './router.js';
export declare function useInitializeOneRouter(context: One.RouteContext, initialLocation: URL | undefined, linking?: OneLinkingConfig): typeof routerStore;
export declare function prepareForSSRRender(): void;
export declare function resetState(): void;
//# sourceMappingURL=useInitializeOneRouter.d.ts.map