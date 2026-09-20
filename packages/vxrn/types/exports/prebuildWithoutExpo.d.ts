export interface PrebuildAppConfig {
    name: string;
    displayName?: string;
    scheme?: string | string[];
    ios?: {
        bundleId: string;
        deploymentTarget?: string;
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
export declare function getNativeDependencyInventory(root: string): Promise<NativeDependencyInventory[]>;
export declare function installNativeDependencies(args: {
    root: string;
    platform?: 'ios' | 'android' | string;
}): void;
//# sourceMappingURL=prebuildWithoutExpo.d.ts.map