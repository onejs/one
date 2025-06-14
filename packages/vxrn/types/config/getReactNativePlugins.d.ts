import type { VXRNOptionsFilled } from './getOptionsFilled';
export declare function getReactNativePlugins(config: VXRNOptionsFilled): (import("vite").Plugin<any> | {
    name: string;
    configResolved(this: void, conf: import("vite").ResolvedConfig): void;
} | {
    name: string;
    handleHotUpdate(this: void, { read, modules, file, server }: import("vite").HmrContext): Promise<void>;
})[];
//# sourceMappingURL=getReactNativePlugins.d.ts.map