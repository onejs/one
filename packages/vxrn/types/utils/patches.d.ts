import type { UserConfig } from 'vite';
import type { VXRNOptionsFilled } from './getOptionsFilled';
type Strategies = 'swc' | 'flow' | 'jsx';
export type DepOptimize = boolean | 'exclude' | 'interop';
export type DepFileStrategy = ((contents?: string) => void | string | Promise<void | string>) | string | Strategies[];
export type DepPatch = {
    module: string;
    patchFiles: {
        optimize?: DepOptimize;
        version?: string;
    } & {
        [key: string]: DepFileStrategy;
    };
};
export declare function bailIfUnchanged(obj1: any, obj2: any): void;
export declare function bailIfExists(haystack: string, needle: string): void;
export declare function applyBuiltInPatches(options: VXRNOptionsFilled): Promise<void>;
export declare function applyOptimizePatches(patches: DepPatch[], config: UserConfig): Promise<void>;
export declare function applyDependencyPatches(patches: DepPatch[], { root }?: {
    root?: string;
}): Promise<void>;
export {};
//# sourceMappingURL=patches.d.ts.map