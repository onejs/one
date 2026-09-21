export interface PrebuildAppConfig {
    name: string;
    displayName?: string;
    scheme?: string | string[];
    icon?: {
        source: string;
        backgroundColor: string;
    };
    splash?: {
        source: string;
        backgroundColor: string;
        width?: number;
    };
    ios?: {
        bundleId: string;
        tablet?: boolean;
        deploymentTarget?: string;
        screensGamma?: boolean;
        useFrameworks?: 'static' | 'dynamic';
        ccache?: boolean;
        usesNonExemptEncryption?: boolean;
        fileSharing?: boolean;
    };
    android?: {
        applicationId: string;
        minSdk?: number;
    };
}
export declare function validatePrebuildApp(app: PrebuildAppConfig, platform?: 'ios' | 'android' | string): void;
export interface RenderedPrebuildFile {
    destRelativePath: string;
    content: string | null;
}
export declare function renderPrebuildFile(args: {
    relativePath: string;
    content: string | null;
    platform: 'ios' | 'android';
    app: PrebuildAppConfig;
}): RenderedPrebuildFile;
export declare const generateForPlatform: (root: string, platform: 'ios' | 'android', app: PrebuildAppConfig, outDir?: string) => Promise<void>;
export interface NativeDependencyInventory {
    name: string;
    version: string;
    platforms: string[];
}
export declare function applyAndroidDependencyPatches(args: {
    root: string;
    app: PrebuildAppConfig;
    inventory: readonly NativeDependencyInventory[];
}): void;
export declare function getNativeDependencyInventory(root: string): Promise<NativeDependencyInventory[]>;
export declare function installNativeDependencies(args: {
    root: string;
    platform?: 'ios' | 'android' | string;
}): void;
//# sourceMappingURL=prebuildWithoutExpo.d.ts.map