import './setup';
import type { RenderAppProps } from './types';
import type { One } from './vite/types';
export type CreateAppProps = {
    routes: Record<string, () => Promise<unknown>>;
    routerRoot: string;
    flags?: One.Flags;
    /**
     * Lazy function that returns a promise for the setup file import.
     * Called at runtime (not build time) to ensure setup code only runs when the app starts.
     */
    getSetupPromise?: () => Promise<unknown>;
};
export declare function createApp(options: CreateAppProps): Promise<void> | {
    options: CreateAppProps;
    render: (props: RenderAppProps) => Promise<string>;
};
//# sourceMappingURL=createApp.d.ts.map