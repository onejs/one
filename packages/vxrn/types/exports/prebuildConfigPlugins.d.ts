import type { ModPlatform } from '@expo/config-plugins';
import { type NativeAppManifest } from '@vxrn/utils/nativeAppManifest';
type Platform = Extract<ModPlatform, 'ios' | 'android'>;
export declare function applyConfigPlugins(args: {
    root: string;
    app: NativeAppManifest;
    platforms: Platform[];
}): Promise<void>;
export {};
//# sourceMappingURL=prebuildConfigPlugins.d.ts.map