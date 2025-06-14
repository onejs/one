import type { VXRNOptionsFilled } from '../config/getOptionsFilled';
import { getReactNativeConfig } from '../config/getReactNativeConfig';
export declare let entryRoot: string;
export declare function clearCachedBundle(): void;
type InternalProps = {
    mode?: 'dev' | 'prod';
    assetsDest?: string;
    useCache?: boolean;
};
export declare function getReactNativeBundle(options: Pick<VXRNOptionsFilled, 'root'> & Partial<Pick<VXRNOptionsFilled, 'cacheDir'>> & Parameters<typeof getReactNativeConfig>[0], platform: 'ios' | 'android', internal?: InternalProps): Promise<string>;
export {};
//# sourceMappingURL=getReactNativeBundle.d.ts.map