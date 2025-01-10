import { type Output } from '@swc/core';
import type { Options } from './types';
export declare function transformSWC(id: string, code: string, options: Options & {
    es5?: boolean;
}): Promise<Output | undefined>;
export declare const transformSWCStripJSX: (id: string, code: string) => Promise<Output | undefined>;
//# sourceMappingURL=transformSWC.d.ts.map