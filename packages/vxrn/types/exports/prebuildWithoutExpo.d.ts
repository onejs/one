import { validateNativeApp, type NativeAppManifest } from '@vxrn/utils/nativeAppManifest';
export type { NativeAppManifest as PrebuildAppConfig } from '@vxrn/utils/nativeAppManifest';
export declare const validatePrebuildApp: typeof validateNativeApp;
export declare function renderSceneDelegateSwift(appName: string): string;
export interface RenderedPrebuildFile {
    destRelativePath: string;
    content: string | null;
}
export declare function renderPrebuildFile(args: {
    relativePath: string;
    content: string | null;
    platform: 'ios' | 'android';
    app: NativeAppManifest;
    nitroWebImage?: boolean;
}): RenderedPrebuildFile;
export declare const generateForPlatform: (root: string, platform: 'ios' | 'android', app: NativeAppManifest, outDir?: string) => Promise<void>;
export interface NativeDependencyInventory {
    name: string;
    version: string;
    platforms: string[];
}
export declare function applyAndroidDependencyPatches(args: {
    root: string;
    app: NativeAppManifest;
    inventory: readonly NativeDependencyInventory[];
}): void;
export declare function getNativeDependencyInventory(root: string): Promise<NativeDependencyInventory[]>;
export declare function installNativeDependencies(args: {
    root: string;
    platform?: 'ios' | 'android' | string;
}): void;
//# sourceMappingURL=prebuildWithoutExpo.d.ts.map