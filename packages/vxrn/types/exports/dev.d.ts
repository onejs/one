import type { VXRNOptions } from '../types';
export type DevOptions = VXRNOptions & {
    clean?: boolean;
};
export declare const dev: (optionsIn: DevOptions) => Promise<{
    viteServer: null;
    start: () => Promise<{
        closePromise: Promise<unknown>;
    }>;
    stop: () => Promise<void>;
}>;
//# sourceMappingURL=dev.d.ts.map