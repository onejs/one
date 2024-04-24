import type { VXRNConfig } from '../types';
export type VXRNConfigFilled = Awaited<ReturnType<typeof getOptionsFilled>>;
export declare function getOptionsFilled(options: VXRNConfig): Promise<{
    packageJSON: import("pkg-types").PackageJson;
    state: State;
    packageRootDir: string;
    cacheDir: string;
    userPatchesDir: string;
    internalPatchesDir: string;
    host: string;
    root: string;
    port: number;
    entryNative?: string | undefined;
    webConfig?: import("vite").InlineConfig | undefined;
    nativeConfig?: import("vite").InlineConfig | undefined;
    flow?: any;
}>;
type State = {
    applyPatches?: boolean;
};
export {};
//# sourceMappingURL=getOptionsFilled.d.ts.map