export interface AppConfig {
    expo?: {
        name?: string;
        slug?: string;
        ios?: {
            bundleIdentifier?: string;
        };
        android?: {
            package?: string;
        };
    };
    name?: string;
}
export declare function getBundleIdFromConfig(root: string): string | undefined;
export declare function getAvailablePort(preferredPort: number, excludePort?: number): Promise<number>;
//# sourceMappingURL=utils.d.ts.map