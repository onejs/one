import type { VXRNOptions } from '../types';
/**
 * The main entry point for dev mode
 *
 * Note that much of the logic is being run by plugins:
 *
 *  - createFileSystemRouter does most of the fs-routes/request handling
 *  - clientTreeShakePlugin handles loaders/transforms
 *
 */
export declare const clean: (rest: VXRNOptions) => Promise<void>;
//# sourceMappingURL=clean.d.ts.map