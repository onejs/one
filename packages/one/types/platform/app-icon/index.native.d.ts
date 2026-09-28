declare function isSupported(): Promise<boolean>;
declare function getCurrentName(): Promise<string | undefined>;
declare function setIcon(name?: string): Promise<void>;
export declare const AppIcon: Readonly<{
    isSupported: typeof isSupported;
    getCurrentName: typeof getCurrentName;
    setIcon: typeof setIcon;
}>;
export {};
//# sourceMappingURL=index.native.d.ts.map