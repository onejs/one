import type { VXRNConfig } from '../types';
export type VXRNConfigFilled = Awaited<ReturnType<typeof getOptionsFilled>>;
export declare function getOptionsFilled(options: VXRNConfig): Promise<{
    entries: {
        native: string;
        server: string;
    };
    packageJSON: import("pkg-types").PackageJson;
    state: State;
    packageRootDir: string;
    cacheDir: string;
    userPatchesDir: string;
    internalPatchesDir: string;
    host: string;
    root: string;
    port: number;
    webConfig?: import("vite").InlineConfig | undefined;
    nativeConfig?: import("vite").InlineConfig | undefined;
    flow?: import("@vxrn/vite-flow").Options | undefined;
}>;
type State = {
    applyPatches?: boolean;
};
export {};
//# sourceMappingURL=getOptionsFilled.d.ts.map