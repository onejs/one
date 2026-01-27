import type { VXRNOptions } from '../types';
import { type SimpleDepPatchObject } from '../utils/patches';
export type PatchOptions = VXRNOptions & {
    deps?: SimpleDepPatchObject;
    force?: boolean;
};
export declare const patch: (optionsIn: PatchOptions) => Promise<void>;
//# sourceMappingURL=patch.d.ts.map