import type { VXRNOptionsFilled } from './getOptionsFilled';
type Strategies = 'swc' | 'flow' | 'jsx';
export type DepPatch = {
    module: string;
    patchFiles: {
        [Key in string]: Key extends 'version' ? string : ((contents?: string) => void | string | Promise<void | string>) | string | Strategies[];
    };
};
export declare function bailIfExists(haystack: string, needle: string): void;
export declare function applyBuiltInPatches(options: VXRNOptionsFilled): Promise<void>;
export declare function applyPatches(patches: DepPatch[], root?: string): Promise<void>;
export {};
//# sourceMappingURL=patches.d.ts.map