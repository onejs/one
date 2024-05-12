import type { VXRNConfigFilled } from '../utils/getOptionsFilled';
export declare function reactNativeHMRPlugin({ root }: VXRNConfigFilled): {
    name: string;
    handleHotUpdate({ read, modules, file }: {
        read: any;
        modules: any;
        file: any;
    }): Promise<void>;
};
//# sourceMappingURL=reactNativeHMRPlugin.d.ts.map