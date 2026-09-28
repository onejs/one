export type PlistValue = string | number | boolean | PlistValue[] | {
    [key: string]: PlistValue;
};
export interface NativeAppManifest {
    name: string;
    displayName?: string;
    scheme?: string | string[];
    version?: string;
    orientation?: 'portrait' | 'landscape' | 'default';
    userInterfaceStyle?: 'light' | 'dark' | 'automatic';
    icon?: {
        source: string;
        backgroundColor: string;
    };
    splash?: {
        source: string;
        backgroundColor: string;
        width?: number;
        resizeMode?: 'contain' | 'cover';
        backgroundImage?: string;
        dark?: {
            source?: string;
            backgroundColor: string;
            backgroundImage?: string;
        };
    };
    fonts?: string[];
    imagePicker?: {
        camera?: string;
    };
    photoLibrary?: {
        addOnly?: string;
        readWrite?: string;
    };
    contacts?: {
        usage: string;
    };
    calendar?: {
        usage?: string;
        remindersUsage?: string;
    };
    location?: {
        whenInUse: string;
        background?: boolean;
    };
    audio?: {
        microphone?: string;
        background?: boolean;
    };
    speech?: {
        recognition: string;
        microphone: string;
    };
    notifications?: {
        push?: boolean;
        apsEnvironment?: 'development' | 'production';
    };
    pictureInPicture?: boolean;
    updates?: {
        url?: string;
        runtimeVersion: string;
    };
    ios?: {
        bundleId: string;
        buildNumber?: string;
        tablet?: boolean;
        deploymentTarget?: string;
        screensGamma?: boolean;
        useFrameworks?: 'static' | 'dynamic';
        ccache?: boolean;
        usesNonExemptEncryption?: boolean;
        accentColor?: {
            light: string;
            dark?: string;
        };
        alternateIcons?: Record<string, {
            source: string;
            backgroundColor: string;
        }>;
        faceIdUsageDescription?: string;
        fileSharing?: boolean;
        associatedDomains?: string[];
        usesAppleSignIn?: boolean;
        googleServicesFile?: string;
        infoPlist?: Record<string, PlistValue>;
        entitlements?: Record<string, PlistValue>;
        widgets?: {
            appGroup: string;
            kind: string;
            displayName: string;
            description: string;
            pushNotifications?: boolean;
        };
        backgroundTasks?: {
            refresh?: string[];
            processing?: string[];
        };
    };
    android?: {
        applicationId: string;
        versionCode?: number;
        minSdk?: number;
        adaptiveIcon?: {
            foreground: string;
            background?: string;
            backgroundColor?: string;
            monochrome?: string;
        };
        targetSdk?: number;
        compileSdk?: number;
        minify?: boolean;
        shrinkResources?: boolean;
        proguardRules?: string;
        permissions?: string[];
        blockedPermissions?: string[];
        googleServicesFile?: string;
        appLinks?: Array<{
            host: string;
            pathPrefix?: string;
        }>;
        googleMapsApiKey?: string;
    };
}
export declare function validateNativeApp(manifest: NativeAppManifest, platform?: 'ios' | 'android' | string): NativeAppManifest;
export declare function expoClientFromNativeApp(app: NativeAppManifest): {
    name: string;
    slug: string;
    scheme: string | string[] | undefined;
    version: string | undefined;
    orientation: "default" | "landscape" | "portrait" | undefined;
    userInterfaceStyle: "automatic" | "dark" | "light";
    icon: string | undefined;
    splash: {
        image: string;
        backgroundImage: string | undefined;
        backgroundColor: string;
        imageWidth: number | undefined;
        resizeMode: "contain" | "cover" | undefined;
        dark: {
            image: string | undefined;
            backgroundImage: string | undefined;
            backgroundColor: string;
        } | undefined;
    } | undefined;
    plugins: (string | {
        fonts: string[];
    })[][] | undefined;
    ios: {
        bundleIdentifier: string;
        buildNumber: string | undefined;
        supportsTablet: boolean | undefined;
        associatedDomains: string[] | undefined;
        usesAppleSignIn: boolean | undefined;
        googleServicesFile: string | undefined;
        infoPlist: Record<string, PlistValue> | undefined;
        entitlements: Record<string, PlistValue> | undefined;
    } | undefined;
    android: {
        package: string;
        versionCode: number | undefined;
        permissions: string[] | undefined;
        blockedPermissions: string[] | undefined;
        googleServicesFile: string | undefined;
        adaptiveIcon: {
            foregroundImage: string;
            backgroundImage: string | undefined;
            backgroundColor: string | undefined;
            monochromeImage: string | undefined;
        } | undefined;
    } | undefined;
};
//# sourceMappingURL=nativeAppManifest.d.ts.map