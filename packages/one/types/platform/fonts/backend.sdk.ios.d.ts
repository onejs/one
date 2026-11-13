declare function isLoaded(name: string): boolean;
declare function load(name: string, uri: string): Promise<void>;
export declare function fontsNative(): {
    load: typeof load;
    isLoaded: typeof isLoaded;
};
export {};
//# sourceMappingURL=backend.sdk.ios.d.ts.map