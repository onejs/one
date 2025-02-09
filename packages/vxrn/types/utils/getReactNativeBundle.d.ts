import type { VXRNOptionsFilled } from './getOptionsFilled';
export declare let entryRoot: string;
export declare function clearCachedBundle(): void;
export declare function getReactNativeBundle(options: VXRNOptionsFilled, platform: 'ios' | 'android', internal?: {
    mode?: 'dev' | 'prod';
    assetsDest?: string;
    useCache?: boolean;
}): Promise<string>;
//# sourceMappingURL=getReactNativeBundle.d.ts.map