import type { VXRNOptions } from '../types.js';
export type PatchOptions = VXRNOptions & {
    force?: boolean;
};
export declare const patch: (optionsIn: PatchOptions) => Promise<void>;
//# sourceMappingURL=patch.d.ts.map