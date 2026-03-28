import type { VXRNOptions } from '../types';
export type DevOptions = VXRNOptions & {
    clean?: boolean;
    /**
     * Path to an extra vite config file to merge on top of the project config (dev only)
     */
    extraConfig?: string;
};
export declare const dev: (optionsIn: DevOptions) => Promise<{
    viteServer: null;
    start: () => Promise<{
        closePromise: Promise<unknown>;
    }>;
    stop: () => Promise<void> | undefined;
}>;
//# sourceMappingURL=dev.d.ts.map