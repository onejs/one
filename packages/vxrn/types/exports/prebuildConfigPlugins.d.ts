import { type NativeAppManifest } from '@vxrn/utils/nativeAppManifest';
type Platform = 'ios' | 'android';
export declare function applyConfigPlugins(args: {
    root: string;
    app: NativeAppManifest;
    platforms: Platform[];
}): Promise<void>;
export {};
//# sourceMappingURL=prebuildConfigPlugins.d.ts.map