export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | {
    [key: string]: JsonValue;
};
export declare const GENERATED_CLOUDFLARE_WRANGLER_RULES: JsonValue[];
export declare function isPlainObject(value: unknown): value is Record<string, JsonValue>;
export declare function hasUserWranglerConfig(root: string): boolean;
export declare function loadUserWranglerConfigSync(root: string): {
    path: string;
    config: Record<string, JsonValue>;
} | null;
export declare function loadUserWranglerConfig(root: string): Promise<{
    path: string;
    config: Record<string, JsonValue>;
} | null>;
export declare function createCloudflareWranglerConfig(projectName: string, userConfig?: Record<string, JsonValue>): Record<string, JsonValue>;
export declare function getCloudflareProjectNameSync(root: string): string;
export declare function getCloudflareProjectName(root: string): Promise<string>;
export declare function isExperimentalWorkerDevEnabled(): boolean;
export declare function shouldEnableWorkerdDev(deploy: unknown, root: string): boolean;
//# sourceMappingURL=cloudflareWranglerConfig.d.ts.map