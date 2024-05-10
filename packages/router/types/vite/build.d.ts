import type { OutputAsset, OutputChunk } from 'rollup';
import { type VXRNConfig } from 'vxrn';
export declare const resolveFile: (path: string) => string;
export declare function build(optionsIn: VXRNConfig, serverOutput: (OutputChunk | OutputAsset)[]): Promise<void>;
//# sourceMappingURL=build.d.ts.map