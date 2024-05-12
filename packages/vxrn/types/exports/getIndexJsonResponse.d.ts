export declare function getIndexJsonResponse({ port, root }: {
    port: number | string;
    root: any;
}): {
    name: string;
    slug: string;
    scheme: string;
    version: string;
    jsEngine: string;
    orientation: string;
    icon: string;
    userInterfaceStyle: string;
    splash: {
        image: string;
        resizeMode: string;
        backgroundColor: string;
        imageUrl: string;
    };
    updates: {
        fallbackToCacheTimeout: number;
    };
    assetBundlePatterns: string[];
    ios: {
        supportsTablet: boolean;
        bundleIdentifier: string;
    };
    android: {
        package: string;
        adaptiveIcon: {
            foregroundImage: string;
            backgroundColor: string;
            foregroundImageUrl: string;
        };
    };
    web: {
        favicon: string;
    };
    extra: {
        eas: {
            projectId: string;
        };
    };
    _internal: {
        isDebug: boolean;
        projectRoot: any;
        dynamicConfigPath: null;
        staticConfigPath: string;
        packageJsonPath: string;
    };
    sdkVersion: string;
    platforms: string[];
    iconUrl: string;
    debuggerHost: string;
    logUrl: string;
    developer: {
        tool: string;
        projectRoot: any;
    };
    packagerOpts: {
        dev: boolean;
    };
    mainModuleName: string;
    __flipperHack: string;
    hostUri: string;
    bundleUrl: string;
    id: string;
};
//# sourceMappingURL=getIndexJsonResponse.d.ts.map