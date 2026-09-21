export interface NativeAppManifest {
    name: string;
    displayName?: string;
    scheme?: string | string[];
    version?: string;
    icon?: {
        source: string;
        backgroundColor: string;
    };
    splash?: {
        source: string;
        backgroundColor: string;
    };
    ios?: {
        bundleId: string;
        tablet?: boolean;
        deploymentTarget?: string;
        screensGamma?: boolean;
        useFrameworks?: 'static' | 'dynamic';
        ccache?: boolean;
        usesNonExemptEncryption?: boolean;
    };
    android?: {
        applicationId: string;
        minSdk?: number;
        adaptiveIcon?: {
            foreground?: string;
            background?: string;
        };
    };
}
export declare function validateNativeApp(manifest: NativeAppManifest): NativeAppManifest;
//# sourceMappingURL=appManifest.d.ts.map