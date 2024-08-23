import type { VXRNOptionsFilled } from './getOptionsFilled';
export type DepPatch = {
    module: string;
    patchFiles: {
        [key: string]: ((contents?: string) => string | Promise<string>) | {
            add: string;
        };
    };
};
export declare function bailIfExists(haystack: string, needle: string): void;
export declare function applyBuiltInPatches(options: VXRNOptionsFilled): Promise<void>;
export declare function applyPatches(patches: DepPatch[], root?: string): Promise<void>;
//# sourceMappingURL=patches.d.ts.map