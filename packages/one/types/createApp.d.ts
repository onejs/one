import './setup';
import type { RenderAppProps } from './types';
import type { One } from './vite/types';
export type CreateAppProps = {
    routes: Record<string, () => Promise<unknown>>;
    routerRoot: string;
    flags?: One.Flags;
    /**
     * Promise that resolves when the setup file has finished loading.
     * The app will wait for this before rendering to ensure setup code runs first.
     */
    setupPromise?: Promise<unknown>;
};
export declare function createApp(options: CreateAppProps): Promise<void> | {
    options: CreateAppProps;
    render: (props: RenderAppProps) => Promise<string>;
};
//# sourceMappingURL=createApp.d.ts.map