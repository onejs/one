import './setup.js';
import type { OneLinkingConfig } from './link/getLinking.js';
import { Root } from './Root.js';
import type { One } from './vite/types.js';
export { Root };
export type CreateHeadlessAppProps = {
    routes: Record<string, () => Promise<unknown>>;
    routerRoot: string;
    path?: string;
    flags?: One.Flags;
    linking?: OneLinkingConfig;
    getSetupPromise?: () => Promise<unknown>;
};
export declare function createApp(options: CreateHeadlessAppProps): Promise<void>;
//# sourceMappingURL=headless.d.ts.map