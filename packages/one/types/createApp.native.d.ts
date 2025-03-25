import type { One } from './vite/types';
import './polyfills-mobile';
import './setup';
export type CreateAppProps = {
    routes: Record<string, () => Promise<unknown>>;
    flags?: One.Flags;
};
export declare function createApp(options: CreateAppProps): void;
//# sourceMappingURL=createApp.native.d.ts.map