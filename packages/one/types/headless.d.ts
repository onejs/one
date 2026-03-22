import './setup';
import { Root } from './Root';
import type { One } from './vite/types';
export { Root };
export type CreateHeadlessAppProps = {
    routes: Record<string, () => Promise<unknown>>;
    routerRoot: string;
    path?: string;
    flags?: One.Flags;
    getSetupPromise?: () => Promise<unknown>;
};
export declare function createApp(options: CreateHeadlessAppProps): Promise<void>;
//# sourceMappingURL=headless.d.ts.map