import type { VXRNOptionsFilled } from '../config/getOptionsFilled';
export declare let entryRoot: string;
export declare function clearCachedBundle(): void;
type InternalProps = {
    mode?: 'dev' | 'prod';
    assetsDest?: string;
    useCache?: boolean;
};
export declare function getReactNativeBundle(options: VXRNOptionsFilled, platform: 'ios' | 'android', internal?: InternalProps): Promise<string>;
export {};
//# sourceMappingURL=getReactNativeBundle.d.ts.map