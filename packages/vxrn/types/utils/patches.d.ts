import type { VXRNOptionsFilled } from '../config/getOptionsFilled';
type Strategies = 'swc' | 'flow' | 'jsx';
export type DepFileStrategy = ((contents?: string) => void | string | Promise<void | string>) | string | Strategies[];
export type DepPatch = {
    module: string;
    patchFiles: {
        version?: string;
    } & {
        [key: string]: DepFileStrategy;
    };
};
export declare function bailIfUnchanged(obj1: any, obj2: any): void;
export declare function bailIfExists(haystack: string, needle: string): void;
export type SimpleDepPatchObject = Record<string, DepPatch['patchFiles']>;
export declare function applyBuiltInPatches(options: Pick<VXRNOptionsFilled, 'root'>, extraPatches?: SimpleDepPatchObject): Promise<void>;
/**
 * Convert a module name to a pnpm content-addressable store glob pattern.
 * Scoped packages: @scope/name -> @scope+name
 * Unscoped packages pass through unchanged.
 */
export declare function moduleToPnpmStorePattern(moduleName: string): string;
export declare function applyDependencyPatches(patches: DepPatch[], { root }?: {
    root?: string;
}): Promise<void>;
export {};
//# sourceMappingURL=patches.d.ts.map