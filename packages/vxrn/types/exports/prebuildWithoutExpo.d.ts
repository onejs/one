import { validateNativeApp, type NativeAppManifest } from '@vxrn/utils/nativeAppManifest';
export type { NativeAppManifest as PrebuildAppConfig } from '@vxrn/utils/nativeAppManifest';
export declare const validatePrebuildApp: typeof validateNativeApp;
export declare function renderSceneDelegateSwift(appName: string): string;
export declare function renderIosAppIntentsSwift(actions: NonNullable<NonNullable<NativeAppManifest['ios']>['appIntents']>['actions']): string;
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
export declare function enableAppComposeIntegration(dest: string): void;
export declare function generateKotlinSources({ root, dest }: {
    root: string;
    dest: string;
}): Promise<void>;
export interface NativeDependencyInventory {
    name: string;
    version: string;
    root: string;
    platforms: string[];
}
export declare function applyAndroidDependencyPatches(args: {
    root: string;
    app: NativeAppManifest;
    inventory: readonly Pick<NativeDependencyInventory, 'name' | 'platforms'>[];
}): void;
export declare function getNativeDependencyInventory(root: string): Promise<NativeDependencyInventory[]>;
export declare function assertNativeModuleRuntimes(args: {
    root: string;
    inventory: readonly NativeDependencyInventory[];
    platforms: readonly ('ios' | 'android')[];
}): void;
export declare function installNativeDependencies(args: {
    root: string;
    platform?: 'ios' | 'android' | string;
}): void;
//# sourceMappingURL=prebuildWithoutExpo.d.ts.map