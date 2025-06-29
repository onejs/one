import type { VXRNOptionsFilled } from '../config/getOptionsFilled';
import { getReactNativeBuildConfig } from '../config/getReactNativeBuildConfig';
export declare let entryRoot: string;
export declare function clearCachedBundle(): void;
type InternalProps = {
    mode?: 'dev' | 'prod';
    assetsDest?: string;
    useCache?: boolean;
};
export declare function getReactNativeBundle(options: Pick<VXRNOptionsFilled, 'root'> & Partial<Pick<VXRNOptionsFilled, 'cacheDir'>> & Parameters<typeof getReactNativeBuildConfig>[0], platform: 'ios' | 'android', internal?: InternalProps): Promise<string>;
export {};
//# sourceMappingURL=getReactNativeBundle.d.ts.map