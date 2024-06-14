import type { VXRNConfigFilled } from '../utils/getOptionsFilled';
export declare function reactNativeHMRPlugin({ root }: VXRNConfigFilled): {
    name: string;
    handleHotUpdate(this: void, { read, modules, file }: import("vite").HmrContext): Promise<void>;
};
//# sourceMappingURL=reactNativeHMRPlugin.d.ts.map