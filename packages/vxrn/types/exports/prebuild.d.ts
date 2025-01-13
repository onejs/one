export declare const prebuild: ({ root, platform, "no-install": noInstall, expo, }: {
    root: string;
    platform?: "ios" | "android" | string;
    "no-install"?: boolean;
    expo: boolean;
}) => Promise<void>;
export declare function replaceInUTF8File(filePath: string, findThis: string, replaceWith: string): Promise<void>;
//# sourceMappingURL=prebuild.d.ts.map