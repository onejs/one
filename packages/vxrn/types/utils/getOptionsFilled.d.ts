import type { VXRNConfig } from '../types';
export type VXRNConfigFilled = Awaited<ReturnType<typeof getOptionsFilled>>;
export declare function getOptionsFilled(options: VXRNConfig, internal?: {
    mode?: 'dev' | 'prod';
}): Promise<{
    protocol: "https:" | "http:";
    entries: {
        native: string;
        web?: string | undefined;
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
    https?: boolean | undefined;
    flow?: import("@vxrn/vite-flow").Options | undefined;
    afterBuild?: ((props: import("..").AfterBuildProps) => void | Promise<void>) | undefined;
    onServe?: ((options: VXRNConfig, app: import("hono").Hono<import("hono").Env, import("hono/types").BlankSchema, "/">) => void) | undefined;
}>;
type State = {
    applyPatches?: boolean;
};
export {};
//# sourceMappingURL=getOptionsFilled.d.ts.map