import type { VXRNOptions } from '../types';
import { type SimpleDepPatchObject } from '../utils/patches';
export type DevOptions = VXRNOptions & {
    clean?: boolean;
    deps?: SimpleDepPatchObject;
};
export declare const patch: (optionsIn: DevOptions) => Promise<void>;
//# sourceMappingURL=patch.d.ts.map