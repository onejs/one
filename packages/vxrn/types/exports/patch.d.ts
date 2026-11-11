import type { VXRNOptions } from '../types';
export type PatchOptions = VXRNOptions & {
    force?: boolean;
};
export declare const patch: (optionsIn: PatchOptions) => Promise<void>;
//# sourceMappingURL=patch.d.ts.map