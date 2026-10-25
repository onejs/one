import './setup';
import { loaderResponseToModule } from './loaderResponseToModule';
import { prepareSsrLoaderProps } from './loaderSearchParams';
import { readLoaderSearch } from './utils/cleanUrl';
import type { RenderAppProps } from './types';
import type { OneLinkingConfig } from './link/getLinking';
import type { One } from './vite/types';
export type CreateAppProps = {
    routes: Record<string, () => Promise<unknown>>;
    routerRoot: string;
    flags?: One.Flags;
    linking?: OneLinkingConfig;
    /**
     * Lazy function that returns a promise for the setup file import.
     * Called at runtime (not build time) to ensure setup code only runs when the app starts.
     */
    getSetupPromise?: () => Promise<unknown>;
};
export declare function createApp(options: CreateAppProps): Promise<void> | {
    options: CreateAppProps;
    loaderRequest: {
        loaderResponseToModule: typeof loaderResponseToModule;
        prepareSsrLoaderProps: typeof prepareSsrLoaderProps;
        readLoaderSearch: typeof readLoaderSearch;
    };
    render: (props: RenderAppProps) => Promise<any>;
    renderStream: (props: RenderAppProps) => Promise<ReadableStream>;
};
//# sourceMappingURL=createApp.d.ts.map