export interface NativeAppManifest {
    name: string;
    displayName?: string;
    scheme?: string | string[];
    version?: string;
    icon?: string;
    splash?: {
        image?: string;
        backgroundColor?: string;
    };
    ios?: {
        bundleId: string;
        tablet?: boolean;
        deploymentTarget?: string;
        screensGamma?: boolean;
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
